import { useState, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useClients } from "@/hooks/useClients";
import { useClientReports, type ClientReport } from "@/hooks/useClientReports";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Globe, Pencil, Calendar, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import ClientReportEditor from "@/pages/ClientReportPage";

export default function ReportsPage() {
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [editorState, setEditorState] = useState<{
    mode: "hub" | "editor";
    clientName?: string;
    fromDate?: string;
    toDate?: string;
    reportId?: string;
  }>({ mode: "hub" });

  const { data: reports = [], isLoading: loadingReports } = useClientReports(selectedClient || undefined);

  const clientNames = useMemo(() => {
    return [...new Set(clients.map((c) => c.name))].sort();
  }, [clients]);

  const drafts = reports.filter((r) => r.status === "draft");
  const published = reports.filter((r) => r.status === "published");

  const handleNewReport = useCallback(() => {
    if (!selectedClient) return;
    setEditorState({
      mode: "editor",
      clientName: selectedClient,
    });
  }, [selectedClient]);

  const handleOpenReport = useCallback((report: ClientReport) => {
    setEditorState({
      mode: "editor",
      clientName: report.client_name,
      fromDate: report.from_date || undefined,
      toDate: report.to_date || undefined,
      reportId: report.id,
    });
  }, []);

  const handleBackToHub = useCallback(() => {
    setEditorState({ mode: "hub" });
  }, []);

  if (editorState.mode === "editor" && editorState.clientName) {
    return (
      <DashboardLayout>
        <div className="mb-4 print:hidden">
          <Button variant="outline" size="sm" onClick={handleBackToHub} className="gap-1.5 text-xs">
            ← Back to Reports
          </Button>
        </div>
        <ClientReportEditor
          embeddedClientName={editorState.clientName}
          embeddedFromDate={editorState.fromDate}
          embeddedToDate={editorState.toDate}
          embeddedReportId={editorState.reportId}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Reports</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Draft and publish client-facing coverage reports
            </p>
          </div>
        </div>

        {/* Client selector + New Report */}
        <div className="flex items-center gap-3">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select a client…" />
            </SelectTrigger>
            <SelectContent>
              {clientNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleNewReport}
            disabled={!selectedClient}
            className="gap-1.5"
            variant="brand"
          >
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        </div>

        {/* Reports list */}
        {selectedClient && (
          <div className="space-y-6">
            {/* Drafts */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">
                Drafts
              </h3>
              {drafts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No drafts yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Click "New Report" to start drafting
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {drafts.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onOpen={handleOpenReport}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Published */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">
                Published
              </h3>
              {published.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                  <Globe className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No published reports</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Publish a draft to generate a shareable client URL
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {published.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onOpen={handleOpenReport}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedClient && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Select a Client</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Choose a client from the dropdown above to view existing reports or create a new one.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ReportCard({ report, onOpen }: { report: ClientReport; onOpen: (r: ClientReport) => void }) {
  const periodLabel = report.from_date || report.to_date
    ? `${report.from_date || "Start"} — ${report.to_date || "Present"}`
    : "All-Time";

  const publicUrl = report.status === "published"
    ? `${window.location.origin}/r/${report.slug}`
    : null;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 hover:shadow-sm transition-shadow">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {report.status === "published" ? (
          <Globe className="h-4 w-4 text-primary" />
        ) : (
          <Pencil className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {report.title || `${report.client_name} Report`}
          </p>
          <Badge variant={report.status === "published" ? "default" : "secondary"} className="text-[10px] shrink-0">
            {report.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {periodLabel}
          </span>
          <span className="text-xs text-muted-foreground/50">
            Updated {formatDate(report.updated_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {publicUrl && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(publicUrl);
            }}
          >
            Copy Link
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => onOpen(report)}
        >
          {report.status === "draft" ? "Edit" : "View"}
        </Button>
      </div>
    </div>
  );
}
