

# Plan: Type Breakdown Trends + Team Performance Trends

## Feature 1 — Coverage Type Breakdown Over Time

**What:** A new section on the Placements page (or a dedicated view) showing how the mix of coverage types (Feature, Mention, Quote, etc.) evolves month-over-month. This answers "are we getting higher-quality coverage over time?"

**Changes:**
- **New component: `src/components/TypeTrendChart.tsx`** — A stacked area or stacked bar chart (Recharts) showing placement counts by type per month. Each type gets its own color band. Includes a year filter.
- **Edit `src/pages/PlacementsPage.tsx`** — Add the `TypeTrendChart` above the table, consuming the same `placements` data. The chart respects current filters (client, team, vertical, etc.) so users can drill into type trends for specific slices.

The chart will:
- Group filtered placements by month (YYYY-MM)
- Count placements per type per month
- Render as a Recharts `BarChart` with stacked bars (one color per type)
- Show last 12–24 months depending on data

---

## Feature 2 — Team Performance Trends

**What:** Add month-over-month trajectory data to each team card on the Teams page, showing whether placements, reach, and ad value are trending up or down.

**Changes:**
- **Edit `src/pages/TeamsPage.tsx`** — For each team, compute monthly aggregates from `placements` data and render:
  - A small sparkline or mini bar chart (Recharts `BarChart` or `AreaChart`, ~80px tall) showing placements per month for the last 6 months
  - Delta indicators next to each KPI showing month-over-month change (e.g., "▲ 12%" or "▼ 5%") comparing current month vs. previous month
- The placement data is already fetched via `usePlacements()` — we just need to bucket by `team_name` + month and compute deltas

The team card will gain:
- A new row below the KPIs with a mini trend chart
- Green/red delta badges on each KPI showing MoM change

---

## File Summary

| Action | File |
|--------|------|
| Create | `src/components/TypeTrendChart.tsx` |
| Edit | `src/pages/PlacementsPage.tsx` (add chart section) |
| Edit | `src/pages/TeamsPage.tsx` (add sparklines + MoM deltas) |

