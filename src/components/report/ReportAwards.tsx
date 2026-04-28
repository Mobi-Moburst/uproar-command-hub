import { StatusBadge } from "@/components/StatusBadge";
import type { AwardSubmission } from "@/data/types";

interface ReportAwardsProps {
  wonAwards: AwardSubmission[];
  allAwards: AwardSubmission[];
}

export function ReportAwards({ wonAwards, allAwards }: ReportAwardsProps) {
  if (allAwards.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Awards & Recognition
      </h2>

      {/* Won awards — featured */}
      {wonAwards.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            Awards Won ({wonAwards.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {wonAwards.map((a) => (
              <div key={a.id} className="rounded-lg border-2 border-primary/30 bg-emerald-light p-4">
                <p className="text-sm font-semibold text-foreground">{a.submission_title}</p>
                <p className="mt-1 text-xs font-mono text-muted-foreground">
                  {a.award_name} — {a.award_edition}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full submissions table */}
      <div className="rounded-lg border border-[rgba(255,255,255,0.05)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.04)]">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Submission</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Award</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Edition</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {allAwards.map((a) => (
              <tr key={a.id} className="border-b border-[rgba(255,255,255,0.05)] last:border-0">
                <td className="px-4 py-2.5 font-sans text-sm font-medium text-foreground">{a.submission_title}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{a.award_name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{a.award_edition}</td>
                <td className="px-4 py-2.5 text-right"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
