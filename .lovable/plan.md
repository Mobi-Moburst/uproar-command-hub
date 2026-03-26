

# Coverage Intelligence — Embedded Metrics + Dedicated Intelligence Page

## What We're Building

Two layers of coverage intelligence using data already flowing through the app (placements, samples, briefings):

1. **Embedded conversion metrics** on existing pages (Overview, Clients, Reporters)
2. **New Intelligence page** with cross-cutting analysis tools

---

## Phase 1: Core Intelligence Hook

Create a `useCoverageIntelligence` hook that cross-references samples, briefings, and placements to compute:

- **Conversion rates** — samples/briefings that resulted in coverage (matched by reporter + client + date proximity)
- **Reporter affinity scores** — which reporters convert best for which verticals/clients
- **Outlet momentum** — which outlets are trending up/down in placement volume over rolling 3-month windows

Matching logic: A sample or briefing "converts" when a placement exists for the same reporter + client within 90 days after the sample/briefing date.

---

## Phase 2: Embedded Metrics on Existing Pages

### Overview Page
- Add a "Coverage Intelligence" section with 3 KPI cards: Sample Conversion Rate, Briefing Conversion Rate, Top Converting Reporter (this month)

### Reporters Page
- Add a "Conversion" column showing each reporter's sample/briefing → coverage conversion rate
- Add vertical affinity tags showing which verticals each reporter converts best in

### Clients Page (detail panel)
- Add a mini conversion funnel showing: Samples Sent → Covered, Briefings Sent → Covered

---

## Phase 3: New Intelligence Page

Add `/intelligence` to the sidebar. The page will have three sections:

### Conversion Funnel
- Filterable by client, team, vertical, date range
- Bar chart showing samples sent vs. covered, briefings sent vs. covered
- Table of individual conversions with reporter, outlet, days-to-coverage

### Reporter Affinity Matrix
- Heatmap-style grid: reporters (rows) × verticals (columns)
- Cell value = conversion rate or placement count
- Click a cell to see the underlying placements
- Sortable by total conversions, recency, or specific vertical

### Outlet Momentum
- Rolling 3-month trend chart showing which outlets are increasing/decreasing in coverage volume
- Filterable by vertical
- Highlight outlets with >20% month-over-month change

---

## Technical Details

### New files
- `src/hooks/useCoverageIntelligence.ts` — core analytics engine
- `src/pages/IntelligencePage.tsx` — dedicated page
- `src/components/intelligence/ConversionFunnel.tsx` — funnel visualization
- `src/components/intelligence/ReporterAffinityMatrix.tsx` — heatmap component
- `src/components/intelligence/OutletMomentum.tsx` — trend chart

### Modified files
- `src/components/AppSidebar.tsx` + `MobileNav.tsx` — add "Intelligence" nav item
- `src/App.tsx` — add `/intelligence` route
- `src/pages/OverviewPage.tsx` — add intelligence KPI cards
- `src/pages/ReportersPage.tsx` + `useReporterAnalytics.ts` — add conversion column
- `src/pages/ClientsPage.tsx` — add conversion funnel to detail panel

### Data dependencies
All computed from existing hooks (`usePlacements`, `useSamples`, `useBriefings`) — no new API calls or database tables needed.

