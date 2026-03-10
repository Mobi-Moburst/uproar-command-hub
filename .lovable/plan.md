

## Improve KPI Cards on Placements Page

### What changes

1. **Clarify scope** — Add a subtitle to the "Total Placements" card showing the date range of the filtered data (e.g., "All time" or "Filtered results").

2. **Add disclaimers** — Add a detail line under "Total Reach" and "Total Ad Value" noting that these are self-reported and often incomplete (e.g., "Self-reported · often blank in source data").

3. **Add a year filter** — Add a Year dropdown to the filter bar so users can scope KPIs to a specific year instead of always seeing all-time numbers.

### File changed
- `src/pages/PlacementsPage.tsx`
  - Add year filter state + `FilterSelect` with year options derived from placement dates
  - Include year in the `filtered` memo logic
  - Add `detail` props to the three `KpiCard` components:
    - Total Placements: shows active filter context (e.g., "All time" or selected year)
    - Total Reach: "Self-reported · often blank"
    - Total Ad Value: "Self-reported · often blank"

