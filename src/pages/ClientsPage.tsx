import { useState, useMemo, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FilterBar, FilterSelect, SearchInput } from "@/components/FilterBar";
import { StatusBadge } from "@/components/StatusBadge";
import { TypeBadge } from "@/components/TypeBadge";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useClients } from "@/hooks/useClients";
import { usePlacements } from "@/hooks/usePlacements";
import { useAwards } from "@/hooks/useAwards";
import { useSamples } from "@/hooks/useSamples";
import { useBriefings } from "@/hooks/useBriefings";
import { useCoverageIntelligence } from "@/hooks/useCoverageIntelligence";
import { useClientSows } from "@/hooks/useClientSows";
import { formatNumber, formatCurrency, formatDateShort } from "@/lib/format";
import { Info, Upload, Download, Trash2, FileText, Star, Loader2 } from "lucide-react";
import { ClientLogoUpload } from "@/components/ClientLogoUpload";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Client, AwardSubmission } from "@/data/types";

const HEALTH_COLORS = {
  green: "bg-emerald-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
} as const;

const HEALTH_RING_COLORS = {
  green: "ring-emerald-500",
  yellow: "ring-yellow-400",
  red: "ring-red-500",
} as const;

export default function ClientsPage() {
  const { data: clients = [], isLoading, isError, refetch } = useClients();
  const { data: placements = [] } = usePlacements();
  const { data: awards = [] } = useAwards();
  const { data: samples = [] } = useSamples();
  const { data: briefings = [] } = useBriefings();
  const { conversions } = useCoverageIntelligence();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [verticalFilter, setVerticalFilter] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { sows, uploading, uploadSow, setAsCurrent, deleteSow, downloadSow } = useClientSows(selectedClient?.name ?? null);
  const sowInputRef = useRef<HTMLInputElement>(null);

  const upsertEnrichment = useCallback(async (clientName: string, updates: Record<string, unknown>) => {
    const { error } = await supabase
      .from("client_enrichment")
      .upsert({ client_name: clientName, ...updates }, { onConflict: "client_name" });
    if (error) {
      toast.error("Failed to save");
    } else {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  }, [queryClient]);

  const handleHealthChange = useCallback((clientName: string, health: "red" | "yellow" | "green") => {
    upsertEnrichment(clientName, { health });
    // Optimistically update selectedClient
    setSelectedClient(prev => prev ? { ...prev, health } : null);
  }, [upsertEnrichment]);

  const handleStatusToggle = useCallback((clientName: string, isActive: boolean) => {
    const status_override = isActive ? "Active" : "Inactive";
    upsertEnrichment(clientName, { status_override });
    setSelectedClient(prev => prev ? { ...prev, status: status_override as Client["status"] } : null);
  }, [upsertEnrichment]);

  const statuses = [...new Set(clients.map((c) => c.status))];
  const teamNames = [...new Set(clients.map((c) => c.team_name))];
  const verticals = [...new Set(clients.map((c) => c.vertical))];

  const filtered = clients.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (teamFilter && c.team_name !== teamFilter) return false;
    if (verticalFilter && c.vertical !== verticalFilter) return false;
    return true;
  });

  const clientPlacements = selectedClient
    ? placements
        .filter((p) => p.client_name === selectedClient.name)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .slice(0, 5)
    : [];

  const clientAwards = selectedClient
    ? awards.filter((a) => a.client_name === selectedClient.name)
    : [];

  const clientSamples = selectedClient
    ? samples.filter((s) => s.client === selectedClient.name)
    : [];

  const clientBriefings = selectedClient
    ? briefings.filter((b) => b.client === selectedClient.name)
    : [];

  const currentYear = new Date().getFullYear();

  const groupedAwards = useMemo(() => {
    if (!clientAwards.length) return [];

    const extractYear = (a: AwardSubmission): number => {
      if (a.due_date) return new Date(a.due_date).getFullYear();
      const match = (a.award_edition || '').match(/\b(20\d{2})\b/)
        || (a.submission_title || '').match(/\b(20\d{2})\b/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const byYear = new Map<number, AwardSubmission[]>();
    clientAwards.forEach((a) => {
      const year = extractYear(a);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(a);
    });

    const statusOrder = ["Won", "Deferred", "Not Selected"];
    const sortedYears = [...byYear.keys()].sort((a, b) => b - a);

    return sortedYears.map((year) => {
      const yearAwards = byYear.get(year)!;
      const byStatus = new Map<string, AwardSubmission[]>();
      yearAwards.forEach((a) => {
        const status = a.status || "Unknown";
        if (!byStatus.has(status)) byStatus.set(status, []);
        byStatus.get(status)!.push(a);
      });

      const sortedStatuses = [...byStatus.keys()].sort((a, b) => {
        const ai = statusOrder.indexOf(a);
        const bi = statusOrder.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

      return {
        year,
        label: year === 0 ? "Unknown Year" : String(year),
        statuses: sortedStatuses.map((s) => ({ status: s, awards: byStatus.get(s)! })),
      };
    });
  }, [clientAwards]);

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            {isLoading ? "Loading..." : `${clients.length} clients total · ${clients.filter(c => c.status === "Active").length} active`}
          </p>
        </div>

        <FilterBar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search clients..." />
          <FilterSelect label="All Statuses" value={statusFilter} options={statuses} onChange={setStatusFilter} />
          <FilterSelect label="All Teams" value={teamFilter} options={teamNames} onChange={setTeamFilter} />
          <FilterSelect label="All Verticals" value={verticalFilter} options={verticals} onChange={setVerticalFilter} />
        </FilterBar>

        {isError ? (
          <ErrorState message="Failed to load clients." onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton columns={10} rows={10} />
        ) : filtered.length === 0 ? (
          <EmptyState message="No clients match your filters." columns={10} />
        ) : (
          <div className="relative">
            <div className={`overflow-x-auto rounded-lg border border-border transition-all ${selectedClient ? "lg:mr-[50%]" : ""}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Team</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Placements</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reach</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ad Value</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Awards</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Wins</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last Placement</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedClient(selectedClient?.id === c.id ? null : c)}
                      className={`cursor-pointer border-b border-border last:border-0 transition-colors ${
                        selectedClient?.id === c.id ? "bg-emerald-light" : "hover:bg-muted/50"
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-sans font-medium text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${HEALTH_COLORS[c.health || "green"]}`} />
                          {c.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.team_name}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      
                      <td className="px-4 py-3 text-right">{c.total_placements}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(c.total_reach)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(c.total_ad_value)}</td>
                      <td className="px-4 py-3 text-right">{c.total_award_submissions}</td>
                      <td className="px-4 py-3 text-right">{c.total_award_wins}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatDateShort(c.last_placement_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedClient && (
              <TooltipProvider>
                <div className="fixed right-0 top-0 z-40 h-screen w-full overflow-y-auto border-l border-border bg-background p-6 shadow-xl animate-slide-in-right lg:w-1/2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <ClientLogoUpload clientName={selectedClient.name} size="md" />
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">{selectedClient.name}</h2>
                        <p className="mt-0.5 text-sm font-mono text-muted-foreground">{selectedClient.team_name}</p>
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          <StatusBadge status={selectedClient.status} />
                          <Switch
                            checked={selectedClient.status === "Active"}
                            onCheckedChange={(checked) => handleStatusToggle(selectedClient.name, checked)}
                          />
                          <span className="h-4 w-px bg-border" />
                          <span className="text-xs text-muted-foreground">Health</span>
                          {(["green", "yellow", "red"] as const).map((color) => (
                            <button
                              key={color}
                              onClick={() => handleHealthChange(selectedClient.name, color)}
                              className={`h-5 w-5 rounded-full border-2 transition-all ${
                                selectedClient.health === color || (!selectedClient.health && color === "green")
                                  ? `${HEALTH_COLORS[color]} ${HEALTH_RING_COLORS[color]} ring-2 ring-offset-2 ring-offset-background`
                                  : `border-muted-foreground/30`
                              }`}
                              style={
                                selectedClient.health !== color && (selectedClient.health || "green") !== color
                                  ? { backgroundColor: color === "green" ? "rgb(16 185 129 / 0.2)" : color === "yellow" ? "rgb(250 204 21 / 0.2)" : "rgb(239 68 68 / 0.2)" }
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                      Close
                    </button>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="rounded-md border border-border p-4">
                      <p className="text-xs text-muted-foreground">Placements</p>
                      <p className="mt-1 font-tight text-2xl font-bold">{selectedClient.total_placements}</p>
                    </div>
                    <div className="rounded-md border border-border p-4">
                      <p className="text-xs text-muted-foreground">Reach</p>
                      <p className="mt-1 font-tight text-2xl font-bold">{formatNumber(selectedClient.total_reach)}</p>
                    </div>
                    <div className="rounded-md border border-border p-4">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Ad Value
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-xs">
                            Many placements leave Ad Value blank, so this total may underrepresent actual value.
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="mt-1 font-tight text-2xl font-bold">{formatCurrency(selectedClient.total_ad_value)}</p>
                    </div>
                    <div className="rounded-md border border-border p-4">
                      <p className="text-xs text-muted-foreground">Award Wins</p>
                      <p className="mt-1 font-tight text-2xl font-bold">{selectedClient.total_award_wins}</p>
                    </div>
                    <div className="rounded-md border border-border p-4">
                      <p className="text-xs text-muted-foreground">Samples</p>
                      <p className="mt-1 font-tight text-2xl font-bold">{clientSamples.length}</p>
                      {clientSamples.length > 0 && (() => {
                        const clientConv = conversions.filter(c => c.type === "sample" && c.client === selectedClient.name);
                        const converted = clientConv.filter(c => c.converted).length;
                        const rate = clientConv.length > 0 ? Math.round((converted / clientConv.length) * 100) : 0;
                        return <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">{rate}% conversion ({converted}/{clientConv.length})</p>;
                      })()}
                    </div>
                    <div className="rounded-md border border-border p-4">
                      <p className="text-xs text-muted-foreground">Briefings</p>
                      <p className="mt-1 font-tight text-2xl font-bold">{clientBriefings.length}</p>
                      {clientBriefings.length > 0 && (() => {
                        const clientConv = conversions.filter(c => c.type === "briefing" && c.client === selectedClient.name);
                        const converted = clientConv.filter(c => c.converted).length;
                        const rate = clientConv.length > 0 ? Math.round((converted / clientConv.length) * 100) : 0;
                        return <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">{rate}% conversion ({converted}/{clientConv.length})</p>;
                      })()}
                    </div>
                  </div>

                  {selectedClient.active_campaign && (
                    <div className="mt-6">
                      <p className="text-xs text-muted-foreground">Active Campaign</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{selectedClient.active_campaign}</p>
                    </div>
                  )}

                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      Recent Placements
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground cursor-help">
                            All-Time
                            <Info className="ml-1 h-2.5 w-2.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-xs">
                          Showing the 5 most recent placements across all time.
                        </TooltipContent>
                      </Tooltip>
                    </h3>
                    {clientPlacements.length > 0 ? (
                      <div className="space-y-2">
                        {clientPlacements.map((p) => (
                          <div key={p.id} className="rounded-md border border-border p-3">
                            <div className="flex items-start justify-between">
                              <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald hover:underline">
                                {p.headline}
                              </a>
                              <TypeBadge type={p.type} />
                            </div>
                            <p className="mt-1 text-xs font-mono text-muted-foreground">
                              {p.outlet} · {formatDateShort(p.date)} · {formatNumber(p.readership_viewership)} reach
                              {p.topic_product && ` · ${p.topic_product}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-mono text-muted-foreground">No placements recorded.</p>
                    )}
                  </div>

                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Award Submissions</h3>
                    {groupedAwards.length > 0 ? (
                      <Accordion type="multiple" defaultValue={[String(currentYear)]}>
                        {groupedAwards.map(({ year, label, statuses }) => (
                          <AccordionItem key={year} value={String(year)}>
                            <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                              {label}
                              <span className="ml-2 text-xs font-mono text-muted-foreground">
                                {statuses.reduce((sum, s) => sum + s.awards.length, 0)} submissions
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <Accordion type="multiple" defaultValue={statuses.map((s) => s.status)}>
                                {statuses.map(({ status, awards: statusAwards }) => (
                                  <AccordionItem key={status} value={status} className="border-none">
                                    <AccordionTrigger className="text-xs font-medium py-1.5 hover:no-underline text-muted-foreground">
                                      {status}
                                      <span className="ml-1.5 text-xs font-mono">({statusAwards.length})</span>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-2 pt-1">
                                        {statusAwards.map((a) => (
                                          <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
                                            <div>
                                              <p className="text-sm font-medium text-foreground">{a.submission_title}</p>
                                              <p className="text-xs font-mono text-muted-foreground">{a.award_name} — {a.award_edition}</p>
                                            </div>
                                            <StatusBadge status={a.status} />
                                          </div>
                                        ))}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-sm font-mono text-muted-foreground">No award submissions.</p>
                    )}
                  </div>

                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Samples</h3>
                    {clientSamples.length > 0 ? (
                      <div className="space-y-2">
                        {clientSamples.slice(0, 5).map((s) => (
                          <div key={s.id} className="rounded-md border border-border p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-foreground">{s.products || "No product listed"}</p>
                                <p className="text-xs font-mono text-muted-foreground">
                                  {s.outlet}{s.reporter_name ? ` · ${s.reporter_name}` : ""}{s.date_requested ? ` · ${formatDateShort(s.date_requested)}` : ""}
                                </p>
                              </div>
                              {s.status && <StatusBadge status={s.status} />}
                            </div>
                            {s.coverage_link && (
                              <a href={s.coverage_link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">
                                View Coverage
                              </a>
                            )}
                          </div>
                        ))}
                        {clientSamples.length > 5 && (
                          <p className="text-xs font-mono text-muted-foreground">+ {clientSamples.length - 5} more samples</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-mono text-muted-foreground">No samples recorded.</p>
                    )}
                  </div>

                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Briefings</h3>
                    {clientBriefings.length > 0 ? (
                      <div className="space-y-2">
                        {clientBriefings.slice(0, 5).map((b) => (
                          <div key={b.id} className="rounded-md border border-border p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-foreground">{b.topic || b.outlet || "Briefing"}</p>
                                <p className="text-xs font-mono text-muted-foreground">
                                  {b.outlet}{b.reporter_name ? ` · ${b.reporter_name}` : ""}{b.interview_type ? ` · ${b.interview_type}` : ""}{b.date_met ? ` · ${formatDateShort(b.date_met)}` : ""}
                                </p>
                              </div>
                              {b.status && <StatusBadge status={b.status} />}
                            </div>
                            {b.coverage_link && (
                              <a href={b.coverage_link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">
                                View Coverage
                              </a>
                            )}
                          </div>
                        ))}
                        {clientBriefings.length > 5 && (
                          <p className="text-xs font-mono text-muted-foreground">+ {clientBriefings.length - 5} more briefings</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-mono text-muted-foreground">No briefings recorded.</p>
                    )}
                  </div>

                  {/* SOW Section */}
                  <div className="mt-8 pb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        Statements of Work
                      </h3>
                      <div>
                        <input
                          ref={sowInputRef}
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadSow(file);
                            e.target.value = "";
                          }}
                        />
                        <button
                          onClick={() => sowInputRef.current?.click()}
                          disabled={uploading}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          Upload SOW
                        </button>
                      </div>
                    </div>

                    {/* Current SOW summary */}
                    {(() => {
                      const currentSow = sows.find(s => s.is_current && s.ai_processed);
                      if (!currentSow) return null;
                      return (
                        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Star className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-semibold text-primary">Current SOW Summary</span>
                          </div>
                          {currentSow.summary && (
                            <p className="text-xs text-foreground leading-relaxed">{currentSow.summary}</p>
                          )}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {currentSow.start_date && (
                              <div>
                                <p className="text-muted-foreground">Start Date</p>
                                <p className="font-medium text-foreground">{formatDateShort(currentSow.start_date)}</p>
                              </div>
                            )}
                            {currentSow.end_date && (
                              <div>
                                <p className="text-muted-foreground">End Date</p>
                                <p className="font-medium text-foreground">{formatDateShort(currentSow.end_date)}</p>
                              </div>
                            )}
                            {currentSow.retainer_amount && (
                              <div>
                                <p className="text-muted-foreground">Retainer</p>
                                <p className="font-medium text-foreground">{currentSow.retainer_amount}</p>
                              </div>
                            )}
                            {currentSow.renewal_date && (
                              <div>
                                <p className="text-muted-foreground">Renewal Date</p>
                                <p className="font-medium text-foreground">{formatDateShort(currentSow.renewal_date)}</p>
                              </div>
                            )}
                          </div>
                          {currentSow.deliverables && currentSow.deliverables.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Deliverables</p>
                              <ul className="list-disc list-inside text-xs text-foreground space-y-0.5">
                                {currentSow.deliverables.map((d, i) => (
                                  <li key={i}>{d}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* SOW list */}
                    {sows.length > 0 ? (
                      <div className="space-y-2">
                        {sows.map((sow) => (
                          <div key={sow.id} className="flex items-center justify-between rounded-md border border-border p-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{sow.file_name}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                  {formatDateShort(sow.uploaded_at)}
                                  {!sow.ai_processed && " · Processing..."}
                                </p>
                              </div>
                              {sow.is_current && <Badge variant="secondary" className="text-[10px] shrink-0">Current</Badge>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!sow.is_current && (
                                <button onClick={() => setAsCurrent(sow.id)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Set as current">
                                  <Star className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button onClick={() => downloadSow(sow)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Download">
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => deleteSow(sow)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-mono text-muted-foreground">No SOWs uploaded yet.</p>
                    )}
                  </div>
                </div>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
