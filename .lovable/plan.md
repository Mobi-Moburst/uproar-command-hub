

## Quick Cleanup Plan

### Changes

**1. Remove Vertical Benchmarking section entirely**
- Delete `src/pages/VerticalsPage.tsx`
- Delete `src/hooks/useVerticalBenchmarks.ts`
- Remove the `/verticals` route from `src/App.tsx`
- Remove "Vertical Benchmarking" nav item from `src/components/AppSidebar.tsx` and `src/components/MobileNav.tsx`
- Remove the `Layers` icon import from AppSidebar

**2. Remove Topics filter from Placements page**
- `src/pages/PlacementsPage.tsx`: Remove `topicFilter` state, `topicProducts` derivation, the Topics `FilterSelect`, the filter condition in `useMemo`, and the "Topic/Product" table column (header + cell)

**3. Remove Types trend chart from Placements page**
- `src/pages/PlacementsPage.tsx`: Remove the `TypeTrendChart` import and the block rendering it

**4. Remove "Top Type" KPI from Briefings page**
- `src/pages/BriefingsPage.tsx`: Remove the `byType` useMemo and the 4th KPI card. Change grid from `lg:grid-cols-4` to `lg:grid-cols-3`

---

### Files deleted
- `src/pages/VerticalsPage.tsx`
- `src/hooks/useVerticalBenchmarks.ts`

### Files modified
- `src/App.tsx` — remove Verticals route + import
- `src/components/AppSidebar.tsx` — remove Verticals nav item + Layers icon
- `src/components/MobileNav.tsx` — remove Verticals nav item
- `src/pages/PlacementsPage.tsx` — remove Topics filter, Topic/Product column, TypeTrendChart
- `src/pages/BriefingsPage.tsx` — remove Top Type KPI card

