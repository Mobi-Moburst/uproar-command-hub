import { DashboardLayout } from "@/components/DashboardLayout";

export default function PitchPipelinePage() {
  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pitch Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            Angle development, reporter targeting and outreach drafting — coming together here
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-12 text-center">
          <p className="text-sm font-medium text-foreground">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This is the home for pitch workflows built on client guardrails and coverage intelligence.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
