import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowRight } from "lucide-react";
import { usePitchCampaigns } from "@/hooks/usePitchPipeline";
import { CampaignCreateDialog } from "@/components/pitch/CampaignCreateDialog";

export default function PitchPipelinePage() {
  const navigate = useNavigate();
  const { campaigns, isLoading, createCampaign } = usePitchCampaigns();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pitch Pipeline</h1>
            <p className="mt-1 text-sm text-muted-foreground font-mono">
              Media lists in, reporters written through to the CRM, pitches out
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New campaign
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-12 text-center">
            <p className="text-sm font-medium text-foreground">No campaigns yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start one with a client and an angle, then import the Muck Rack list you built for it.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => navigate(`/pitch-pipeline/${campaign.id}`)}
                className="flex w-full items-center justify-between gap-4 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.06)]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {campaign.client_name}
                    </span>
                    <Badge variant="outline" className="text-[11px] capitalize">
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{campaign.angle}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <CampaignCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isCreating={createCampaign.isPending}
        onCreate={(input) =>
          createCampaign.mutate(input, {
            onSuccess: (data) => {
              setDialogOpen(false);
              navigate(`/pitch-pipeline/${data.id}`);
            },
          })
        }
      />
    </DashboardLayout>
  );
}
