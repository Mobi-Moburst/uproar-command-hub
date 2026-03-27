

## Plan: Add 5 New Report Sections

Based on the Visory Health reference report, we'll add the following features:

### 1. Wrap-Up Section (Takeaways + Next Steps)
**New file:** `src/components/report/ReportWrapUp.tsx`
- Two-column layout: "Key Takeaways" (left) and "Upcoming Initiatives" (right)
- Each column is a list of editable text items with add/remove controls (same pattern as custom insights in `ReportInsights`)
- Stored in `CurationState` as `takeaways: string[]` and `upcomingInitiatives: string[]`
- Placed after Awards, before Footer

### 2. KPI Goal Tracking
**Modify:** `src/components/report/ReportKpis.tsx`
- Add optional `goals` prop: `Record<string, string>` mapping KPI IDs to target values (e.g., `"kpi-total-placements": "8+"`)
- When in edit mode, show an inline input below each KPI value to set a goal
- Display goal as a subtle "Goal: 8+" line beneath the value
- Goals stored in `CurationState` as `kpiGoals: Record<string, string>`

### 3. PR Overview / Tactics Narrative
**New file:** `src/components/report/ReportPROverview.tsx`
- Editable textarea section placed between Hero and Exec Summary
- Header: "PR Overview & Tactics"
- Pre-populated empty; team writes strategic narrative
- Stored in `CurationState` as `prOverview: string`

### 4. Coverage Clip Thumbnails (Feature 5 from list)
**Modify:** `src/components/report/ReportHighlights.tsx`
- For each highlight with a `link`, attempt to show an OG image thumbnail
- Use a simple `<img>` tag with the link's OG image URL via a proxy pattern (or fallback gracefully)
- Create a small edge function `og-image` that fetches a URL and extracts the `og:image` meta tag
- Fallback to text-only card if no image available
- Hero card gets a larger thumbnail; list items get a small 64px square thumbnail

### 5. Activity Highlights by Category (Feature 6 from list)
**Modify:** `src/components/report/ReportHighlights.tsx`
- Group the coverage highlights by `type` (Feature, Interview, Contributed, Announcement, etc.)
- Each group gets its own sub-header and optional editable narrative text area
- Narrative text per category stored in `CurationState` as `categoryNarratives: Record<string, string>`

---

### Shared Changes

**Modify `CurationState` type** (`src/hooks/useClientReports.ts`):
Add fields: `takeaways`, `upcomingInitiatives`, `prOverview`, `kpiGoals`, `categoryNarratives`

**Modify `ReportEditContext`** (`src/contexts/ReportEditContext.tsx`):
Add state + getters/setters for the new fields, include them in `getCurationState` and `loadCurationState`

**Modify `ClientReportPage.tsx`**:
Import and render `ReportPROverview` (after hero, before exec summary) and `ReportWrapUp` (after awards, before footer), wrapped in `EditableSection`

**Modify `PublicReportPage.tsx`**:
Render the new sections conditionally based on `hiddenSections`, reading data from curation state

### Technical Details

**New files:**
- `src/components/report/ReportWrapUp.tsx`
- `src/components/report/ReportPROverview.tsx`
- `supabase/functions/og-image/index.ts` (edge function for OG image extraction)

**Modified files:**
- `src/hooks/useClientReports.ts` — extend `CurationState` interface
- `src/contexts/ReportEditContext.tsx` — add state for new fields
- `src/components/report/ReportKpis.tsx` — goal tracking display/edit
- `src/components/report/ReportHighlights.tsx` — category grouping + thumbnails
- `src/pages/ClientReportPage.tsx` — add new sections to layout
- `src/pages/PublicReportPage.tsx` — render new sections on public page

**No database migrations needed** — all new data lives in the existing `curation_state` JSONB column.

