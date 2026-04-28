import { formatNumber, formatDateShort } from "@/lib/format";
import { TypeBadge } from "@/components/TypeBadge";
import { EditableSection } from "./ReportEditControls";
import { useReportEdit } from "@/contexts/ReportEditContext";
import { Plus, Star } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MediaPlacement } from "@/data/types";

interface ManualEntry {
  id: string;
  headline: string;
  outlet: string;
  date: string;
  type: string;
  reach: string;
  link: string;
  isHero?: boolean;
}

interface ReportHighlightsProps {
  placements: MediaPlacement[];
}

function useOgImages(links: string[]) {
  const [images, setImages] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const toFetch = links.filter((l) => l && !(l in images));
    if (toFetch.length === 0) return;

    toFetch.forEach(async (url) => {
      try {
        const { data } = await supabase.functions.invoke("og-image", { body: { url } });
        setImages((prev) => ({ ...prev, [url]: data?.image || null }));
      } catch {
        setImages((prev) => ({ ...prev, [url]: null }));
      }
    });
  }, [links.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return images;
}

export function ReportHighlights({ placements }: ReportHighlightsProps) {
  const { isEditing, manualHighlights, setManualHighlights, categoryNarratives, setCategoryNarrative } = useReportEdit();
  const [showForm, setShowForm] = useState(false);
  const [useAsHero, setUseAsHero] = useState(false);
  const [form, setForm] = useState<Omit<ManualEntry, "id" | "isHero">>({
    headline: "",
    outlet: "",
    date: "",
    type: "Feature",
    reach: "",
    link: "",
  });

  const heroOverride = manualHighlights.find((m) => m.isHero);
  const manualEntries = manualHighlights.filter((m) => !m.isHero);

  const handleAdd = useCallback(() => {
    if (!form.headline.trim() || !form.outlet.trim()) return;

    const entry: ManualEntry = {
      ...form,
      id: `manual-${Date.now()}`,
      isHero: useAsHero,
    };

    setManualHighlights((prev) => {
      if (useAsHero) {
        return [...prev.filter((p) => !p.isHero), entry];
      }
      return [...prev, entry];
    });

    setForm({ headline: "", outlet: "", date: "", type: "Feature", reach: "", link: "" });
    setUseAsHero(false);
    setShowForm(false);
  }, [form, useAsHero, setManualHighlights]);

  if (placements.length === 0 && manualHighlights.length === 0) return null;

  const typeWeight = (t: string) => {
    const w: Record<string, number> = { Feature: 5, Announcement: 3, Contributed: 3, Interview: 4, Syndication: 1, Mention: 1 };
    return w[t] ?? 2;
  };

  const sorted = [...placements].sort(
    (a, b) => (typeWeight(b.type) * Math.max(b.readership_viewership, 1)) - (typeWeight(a.type) * Math.max(a.readership_viewership, 1))
  );

  // Group by type for category view
  const grouped = new Map<string, typeof sorted>();
  sorted.forEach((p) => {
    const type = p.type || "Other";
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type)!.push(p);
  });

  // Collect links for OG images
  const allLinks = [
    ...sorted.slice(0, 15).map((p) => p.link).filter(Boolean),
    ...manualHighlights.map((m) => m.link).filter(Boolean),
  ];
  const ogImages = useOgImages(allLinks);

  const hero = sorted[0];

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Coverage Highlights
      </h2>

      {/* Hero card */}
      {heroOverride ? (
        <EditableSection id={`highlight-${heroOverride.id}`}>
          <HighlightHeroCard
            headline={heroOverride.headline}
            outlet={heroOverride.outlet}
            date={heroOverride.date}
            type={heroOverride.type}
            reach={heroOverride.reach ? `${heroOverride.reach} reach` : "N/A impressions"}
            link={heroOverride.link}
            ogImage={ogImages[heroOverride.link] || undefined}
          />
        </EditableSection>
      ) : hero ? (
        <EditableSection id={`highlight-${hero.id}`}>
          <HighlightHeroCard
            headline={hero.headline}
            outlet={hero.outlet}
            date={hero.date || ""}
            type={hero.type}
            reach={hero.readership_viewership > 0 ? `${formatNumber(hero.readership_viewership)} impressions` : "N/A impressions"}
            link={hero.link}
            ogImage={ogImages[hero.link] || undefined}
          />
        </EditableSection>
      ) : null}

      {/* Category-grouped highlights */}
      <div className="mt-6 space-y-6">
        {Array.from(grouped.entries()).map(([type, items]) => {
          // Skip hero from grouped display
          const displayItems = items.filter((p) => p.id !== hero?.id).slice(0, 10);
          if (displayItems.length === 0) return null;

          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <TypeBadge type={type} />
                <span className="text-xs font-mono text-muted-foreground">
                  ({items.length} {items.length === 1 ? "placement" : "placements"})
                </span>
              </div>

              {/* Category narrative */}
              {isEditing ? (
                <textarea
                  value={categoryNarratives[type] || ""}
                  onChange={(e) => setCategoryNarrative(type, e.target.value)}
                  placeholder={`Add context about ${type} coverage…`}
                  className="mb-2 w-full rounded-md border border-[rgba(255,255,255,0.05)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none print:hidden"
                  rows={2}
                />
              ) : categoryNarratives[type] ? (
                <p className="mb-2 text-sm text-muted-foreground leading-relaxed">{categoryNarratives[type]}</p>
              ) : null}

              <div className="space-y-2">
                {displayItems.map((p) => (
                  <EditableSection key={p.id} id={`highlight-${p.id}`}>
                    <HighlightRow
                      headline={p.headline}
                      outlet={p.outlet}
                      date={p.date || ""}
                      reach={p.readership_viewership}
                      link={p.link}
                      ogImage={ogImages[p.link] || undefined}
                    />
                  </EditableSection>
                ))}
              </div>
            </div>
          );
        })}

        {/* Manual entries */}
        {manualEntries.length > 0 && (
          <div>
            {manualEntries.map((m) => (
              <EditableSection key={m.id} id={`highlight-${m.id}`}>
                <div className="flex items-center gap-4 rounded-lg border border-primary/20 glass px-5 py-3 mb-2">
                  {ogImages[m.link] && (
                    <img src={ogImages[m.link]!} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    {m.link ? (
                      <a href={m.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block">
                        {m.headline}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate">{m.headline}</p>
                    )}
                    <p className="mt-0.5 text-xs font-mono text-muted-foreground">
                      {m.outlet}{m.date && ` · ${formatDateShort(m.date)}`}{m.reach && ` · ${m.reach} reach`}
                    </p>
                  </div>
                  <TypeBadge type={m.type} />
                </div>
              </EditableSection>
            ))}
          </div>
        )}

        {/* Add coverage form */}
        {isEditing && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[rgba(255,255,255,0.05)] bg-[rgba(18,20,24,0.5)] px-5 py-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors print:hidden"
          >
            <Plus className="h-4 w-4" />
            Add Coverage
          </button>
        )}

        {isEditing && showForm && (
          <div className="rounded-lg border border-primary/30 glass p-5 space-y-3 print:hidden">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Headline *" value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} className="col-span-2 rounded-md border border-[rgba(255,255,255,0.05)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              <input type="text" placeholder="Outlet *" value={form.outlet} onChange={(e) => setForm((f) => ({ ...f, outlet: e.target.value }))} className="rounded-md border border-[rgba(255,255,255,0.05)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="rounded-md border border-[rgba(255,255,255,0.05)] bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="rounded-md border border-[rgba(255,255,255,0.05)] bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                <option>Feature</option>
                <option>Announcement</option>
                <option>Interview</option>
                <option>Contributed</option>
                <option>Syndication</option>
                <option>Mention</option>
              </select>
              <input type="text" placeholder="Reach (e.g. 50K)" value={form.reach} onChange={(e) => setForm((f) => ({ ...f, reach: e.target.value }))} className="rounded-md border border-[rgba(255,255,255,0.05)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              <input type="url" placeholder="Link (optional)" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className="col-span-2 rounded-md border border-[rgba(255,255,255,0.05)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setUseAsHero((v) => !v)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${useAsHero ? "bg-primary/10 text-primary border border-primary/30" : "border border-[rgba(255,255,255,0.05)] text-muted-foreground hover:text-foreground hover:border-[rgba(255,255,255,0.05)]"}`}>
                <Star className={`h-3 w-3 ${useAsHero ? "fill-primary" : ""}`} />
                Use as Top Highlight
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={handleAdd} disabled={!form.headline.trim() || !form.outlet.trim()} className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Add</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HighlightHeroCard({ headline, outlet, date, type, reach, link, ogImage }: { headline: string; outlet: string; date: string; type: string; reach: string; link?: string; ogImage?: string }) {
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.05)] glass p-6">
      <div className="flex items-start gap-4">
        {ogImage && (
          <img src={ogImage} alt="" className="h-24 w-36 rounded-md object-cover shrink-0 hidden sm:block" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono text-muted-foreground mb-1">
            {outlet}{date && ` · ${formatDateShort(date)}`}
          </p>
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-foreground hover:text-primary transition-colors leading-snug">
              {headline}
            </a>
          ) : (
            <p className="text-lg font-semibold text-foreground leading-snug">{headline}</p>
          )}
          <p className="mt-2 text-sm font-mono text-muted-foreground">{reach}</p>
        </div>
        <TypeBadge type={type} />
      </div>
    </div>
  );
}

function HighlightRow({ headline, outlet, date, reach, link, ogImage }: { headline: string; outlet: string; date: string; reach: number; link: string; ogImage?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-[rgba(255,255,255,0.05)] glass px-5 py-3">
      {ogImage && (
        <img src={ogImage} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block">
          {headline}
        </a>
        <p className="mt-0.5 text-xs font-mono text-muted-foreground">
          {outlet} · {formatDateShort(date)} · {reach > 0 ? `${formatNumber(reach)} reach` : "N/A reach"}
        </p>
      </div>
    </div>
  );
}
