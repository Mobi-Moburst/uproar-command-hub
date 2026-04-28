import { useState, useCallback } from "react";
import { Save, Globe, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveReport, hashReportPassword, type CurationState, type ClientReport } from "@/hooks/useClientReports";

interface ReportSaveControlsProps {
  clientName: string;
  fromDate: string;
  toDate: string;
  getCurationState: () => CurationState;
  existingReport?: ClientReport | null;
  onSaved?: (report: ClientReport) => void;
}

export function ReportSaveControls({
  clientName,
  fromDate,
  toDate,
  getCurationState,
  existingReport,
  onSaved,
}: ReportSaveControlsProps) {
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [title, setTitle] = useState(existingReport?.title || "");
  const [isPublishing, setIsPublishing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const saveReport = useSaveReport();

  const handleSaveDraft = useCallback(async () => {
    const curation = getCurationState();
    const result = await saveReport.mutateAsync({
      id: existingReport?.id,
      client_name: clientName,
      from_date: fromDate,
      to_date: toDate,
      status: "draft",
      title: title || `${clientName} Report`,
      curation_state: curation,
    });
    onSaved?.(result);
  }, [clientName, fromDate, toDate, getCurationState, existingReport, title, saveReport, onSaved]);

  const handlePublish = useCallback(async () => {
    if (password !== confirmPassword) {
      return;
    }
    setIsPublishing(true);
    try {
      const hash = password ? await hashReportPassword(password) : undefined;
      const curation = getCurationState();
      const result = await saveReport.mutateAsync({
        id: existingReport?.id,
        client_name: clientName,
        from_date: fromDate,
        to_date: toDate,
        status: "published",
        title: title || `${clientName} Report`,
        password_hash: hash,
        curation_state: curation,
      });
      onSaved?.(result);
      setShowPublishDialog(false);
    } finally {
      setIsPublishing(false);
    }
  }, [clientName, fromDate, toDate, password, confirmPassword, getCurationState, existingReport, title, saveReport, onSaved]);

  const publishedUrl = existingReport?.status === "published" && existingReport?.slug
    ? `${window.location.origin}/r/${existingReport.slug}`
    : null;

  const copyUrl = useCallback(() => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  }, [publishedUrl]);

  return (
    <>
      <div className="print:hidden flex items-center gap-2">
        {/* Status badge */}
        {existingReport && (
          <span className={`text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded-full ${
            existingReport.status === "published"
              ? "bg-primary/10 text-primary"
              : "bg-[rgba(255,255,255,0.04)] text-muted-foreground"
          }`}>
            {existingReport.status}
          </span>
        )}

        {publishedUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={copyUrl}
            className="gap-1.5 text-xs"
          >
            {copiedUrl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copiedUrl ? "Copied!" : "Copy Link"}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveDraft}
          disabled={saveReport.isPending}
          className="gap-1.5 text-xs"
        >
          <Save className="h-3 w-3" />
          Save Draft
        </Button>

        <Button
          size="sm"
          onClick={() => setShowPublishDialog(true)}
          className="gap-1.5 text-xs"
          variant="brand"
        >
          <Globe className="h-3 w-3" />
          Publish
        </Button>
      </div>

      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish Report</DialogTitle>
            <DialogDescription>
              This will create a shareable URL for {clientName}. Set a password to protect access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="report-title">Report Title</Label>
              <Input
                id="report-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${clientName} Q1 Report`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-password">Password</Label>
              <Input
                id="report-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password for client access"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-confirm-password">Confirm Password</Label>
              <Input
                id="report-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={handlePublish}
              disabled={isPublishing || !password || password !== confirmPassword}
            >
              {isPublishing ? "Publishing…" : "Publish Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
