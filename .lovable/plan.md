

# Plan: Three Analytics Features

## 1. Surface `topic_product` Across the Platform

**What:** Make the `topic_product` field (already captured from Airtable and stored in the archive) visible and filterable throughout the app.

**Changes:**
- **PlacementsPage.tsx** — Add a "Topic/Product" column to the table (after Vertical) and a new `FilterSelect` for topic/product values
- **OverviewPage.tsx** — No changes needed (top placements table stays lean)
- **ClientsPage.tsx** — Show topic/product in the client detail placement list
- **WeeklyWinsPage.tsx** — Display topic/product as metadata on win cards

---

## 2. Reporter Analytics Page

**What:** A new `/reporters` page that aggregates placement data by reporter, showing relationship depth and outlet affiliations.

**Changes:**
- **New file: `src/pages/ReportersPage.tsx`** — Main page with:
  - KPI cards: unique reporters, total placements with named reporters, top outlet by reporter count
  - Filterable/searchable table of reporters with columns: Reporter Name, Placement Count, Unique Clients Covered, Primary Outlet(s), Top Vertical, Total Reach, Most Recent Placement Date
  - Click/expand a reporter row to show their placement history and a "Relationship Score" (composite of frequency, recency, type escalation)
  - Relationship Score formula: weighted blend of placement count (30%), recency in days (30%), type quality — features/interviews score higher than mentions (25%), client breadth (15%)
- **New file: `src/hooks/useReporterAnalytics.ts`** — Hook that derives reporter aggregates from existing `usePlacements()` data (no new API calls)
- **AppSidebar.tsx + MobileNav.tsx** — Add "Reporters" nav item
- **App.tsx** — Add `/reporters` route

---

## 3. Vertical Benchmarking Dashboard

**What:** A new `/verticals` page that compares performance metrics across industry verticals.

**Changes:**
- **New file: `src/pages/VerticalsPage.tsx`** — Main page with:
  - KPI cards: number of verticals, vertical with highest reach, vertical with most features
  - Comparative table: Vertical, Placement Count, Feature %, Avg Reach per Placement, Total Ad Value, Unique Reporters, Unique Clients, Reporter Depth (reporters per client)
  - Visual bar chart (using Recharts, already in the project) showing reach by vertical
  - Expandable rows showing top outlets and top reporters per vertical
  - Year filter to compare vertical performance across time periods
- **New file: `src/hooks/useVerticalBenchmarks.ts`** — Hook deriving vertical aggregates from `usePlacements()` data
- **AppSidebar.tsx + MobileNav.tsx** — Add "Verticals" nav item
- **App.tsx** — Add `/verticals` route

---

## Shared Work

- **AppSidebar.tsx** and **MobileNav.tsx** updated once with both new nav items ("Reporters" and "Verticals")
- **App.tsx** updated once with both new routes
- All three features consume existing `usePlacements()` data — no new API calls or database changes required

## File Summary

| Action | File |
|--------|------|
| Edit | `src/pages/PlacementsPage.tsx` (topic/product column + filter) |
| Edit | `src/pages/WeeklyWinsPage.tsx` (show topic/product) |
| Edit | `src/pages/ClientsPage.tsx` (show topic/product in detail) |
| Create | `src/pages/ReportersPage.tsx` |
| Create | `src/hooks/useReporterAnalytics.ts` |
| Create | `src/pages/VerticalsPage.tsx` |
| Create | `src/hooks/useVerticalBenchmarks.ts` |
| Edit | `src/components/AppSidebar.tsx` (add 2 nav items) |
| Edit | `src/components/MobileNav.tsx` (add 2 nav items) |
| Edit | `src/App.tsx` (add 2 routes) |

