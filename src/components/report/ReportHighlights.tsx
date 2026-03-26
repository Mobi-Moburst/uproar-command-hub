import { formatNumber, formatDateShort } from "@/lib/format";
import { TypeBadge } from "@/components/TypeBadge";
import { EditableSection } from "./ReportEditControls";
import { useReportEdit } from "@/contexts/ReportEditContext";
import { Plus, Star } from "lucide-react";
import { useState, useCallback } from "react";
import type { MediaPlacement } from "@/data/types";

interface ManualEntry {
  id: string;
  headline: string;
  outlet: string;
  date: string;
  type: string;
  reach: string;
  link: string;
}

interface ReportHighlightsProps {
  placements: MediaPlacement[];
}

export function ReportHighlights({ placements }: ReportHighlightsProps) {
  const { isEditing, manualHighlights, setManualHighlights } = useReportEdit();
  const [showForm, setShowForm] = useState(false);
  const [useAsHero, setUseAsHero] = useState(false);
  const [useAsHero, setUseAsHero] = useState(false);
  const [form, setForm] = useState<Omit<ManualEntry, "id">>({
    headline: "",
    outlet: "",
    date: "",
    type: "Feature",
    reach: "",
    link: "",
  });

  const handleAdd = useCallback(() => {
    if (!form.headline.trim() || !form.outlet.trim()) return;
    const entry = { ...form, id: `manual-${Date.now()}` };
    if (useAsHero) {
      setHeroOverride(entry);
    } else {
      setManualEntries((prev) => [...prev, entry]);
    }
    setForm({ headline: "", outlet: "", date: "", type: "Feature", reach: "", link: "" });
    setUseAsHero(false);
    setShowForm(false);
  }, [form, useAsHero]);

  if (placements.length === 0 && manualEntries.length === 0) return null;

  // Score placements by impact: type weight × reach
  const typeWeight = (t: string) => {
    const w: Record<string, number> = { Feature: 5, Announcement: 3, Contributed: 3, Interview: 4, Syndication: 1, Mention: 1 };
    return w[t] ?? 2;
  };
  const sorted = [...placements].sort(
    (a, b) => (typeWeight(b.type) * Math.max(b.readership_viewership, 1)) - (typeWeight(a.type) * Math.max(a.readership_viewership, 1))
  );
  const hero = sorted[0];
  const rest = sorted.slice(1, 15);

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Coverage Highlights
      </h2>

      {/* Hero placement — manual override or top scored */}
      {heroOverride ? (
        <EditableSection id={`highlight-${heroOverride.id}`}>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  {heroOverride.outlet}
                  {heroOverride.date && ` · ${formatDateShort(heroOverride.date)}`}
                </p>
                {heroOverride.link ? (
                  <a href={heroOverride.link} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-foreground hover:text-primary transition-colors leading-snug">
                    {heroOverride.headline}
                  </a>
                ) : (
                  <p className="text-lg font-semibold text-foreground leading-snug">{heroOverride.headline}</p>
                )}
                <p className="mt-2 text-sm font-mono text-muted-foreground">
                  {heroOverride.reach ? `${heroOverride.reach} reach` : "N/A impressions"}
                </p>
              </div>
              <TypeBadge type={heroOverride.type} />
            </div>
          </div>
        </EditableSection>
      ) : hero ? (
        <EditableSection id={`highlight-${hero.id}`}>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  {hero.outlet} · {formatDateShort(hero.date)}
                </p>
                <a
                  href={hero.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-foreground hover:text-primary transition-colors leading-snug"
                >
                  {hero.headline}
                </a>
                <p className="mt-2 text-sm font-mono text-muted-foreground">
                  {hero.readership_viewership > 0 ? `${formatNumber(hero.readership_viewership)} impressions` : "N/A impressions"}
                </p>
              </div>
              <TypeBadge type={hero.type} />
            </div>
          </div>
        </EditableSection>
      ) : null}

      {/* Remaining highlights */}
      <div className="mt-3 space-y-2">
        {rest.map((p) => (
          <EditableSection key={p.id} id={`highlight-${p.id}`}>
            <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-3">
              <div className="min-w-0 flex-1">
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                >
                  {p.headline}
                </a>
                <p className="mt-0.5 text-xs font-mono text-muted-foreground">
                  {p.outlet} · {formatDateShort(p.date)} · {p.readership_viewership > 0 ? `${formatNumber(p.readership_viewership)} reach` : "N/A reach"}
                </p>
              </div>
              <TypeBadge type={p.type} />
            </div>
          </EditableSection>
        ))}

        {/* Manual entries */}
        {manualEntries.map((m) => (
          <EditableSection key={m.id} id={`highlight-${m.id}`}>
            <div className="flex items-center gap-4 rounded-lg border border-primary/20 bg-card px-5 py-3">
              <div className="min-w-0 flex-1">
                {m.link ? (
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {m.headline}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-foreground truncate">{m.headline}</p>
                )}
                <p className="mt-0.5 text-xs font-mono text-muted-foreground">
                  {m.outlet}
                  {m.date && ` · ${formatDateShort(m.date)}`}
                  {m.reach && ` · ${m.reach} reach`}
                </p>
              </div>
              <TypeBadge type={m.type} />
            </div>
          </EditableSection>
        ))}

        {/* Add coverage — edit mode only */}
        {isEditing && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors print:hidden"
          >
            <Plus className="h-4 w-4" />
            Add Coverage
          </button>
        )}

        {isEditing && showForm && (
          <div className="rounded-lg border border-primary/30 bg-card p-5 space-y-3 print:hidden">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Headline *"
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <input
                type="text"
                placeholder="Outlet *"
                value={form.outlet}
                onChange={(e) => setForm((f) => ({ ...f, outlet: e.target.value }))}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                <option>Feature</option>
                <option>Announcement</option>
                <option>Interview</option>
                <option>Contributed</option>
                <option>Syndication</option>
                <option>Mention</option>
              </select>
              <input
                type="text"
                placeholder="Reach (e.g. 50K)"
                value={form.reach}
                onChange={(e) => setForm((f) => ({ ...f, reach: e.target.value }))}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <input
                type="url"
                placeholder="Link (optional)"
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseAsHero((v) => !v)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  useAsHero
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "border border-border text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Star className={`h-3 w-3 ${useAsHero ? "fill-primary" : ""}`} />
                Use as Top Highlight
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.headline.trim() || !form.outlet.trim()}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
