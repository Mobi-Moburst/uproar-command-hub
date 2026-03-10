

## Problem

`recentPlacements` is just `placements.slice(0, 8)` — no sorting. The array order depends on how records come back from the DB and Airtable merge, so you get random dates (Dec, Jan, Feb, Oct, etc.) instead of the most recent ones.

## Fix

In `src/pages/OverviewPage.tsx`, sort placements by date descending before slicing:

```ts
const recentPlacements = [...placements]
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 8);
```

This ensures the "Recent Media Placements" table shows the 8 most recent placements (likely all from March 2026).

One-line change, no other files affected.

