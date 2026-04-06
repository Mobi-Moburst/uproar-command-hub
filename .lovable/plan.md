

## Plan: Re-seed Placements Archive from New Clips Table

### Problem
The `placements_archive` DB table was seeded from the old (now deleted) Clips table. The new table has ~22,730 records but the app only shows ~21,774 — the archive is missing ~1,000 historical records.

### Solution

**1. Truncate + re-seed the archive**
- Run the existing `seed-placements-archive` edge function, which already points to the new table (`tblw34mWTvuaIUz16`) and fetches the Outlets lookup table
- But first, truncate `placements_archive` via a migration so we start clean (old record IDs from the deleted table won't conflict)

**2. Fix the 422 filter error**
- The runtime error shows `filterByFormula` with lowercase `date` is still being rejected
- Update `src/services/placementsService.ts` to use the correct BOM-prefixed field name: `IS_AFTER({﻿Date}, "2025-12-31")` — or better, use the capital-D `{Date}` since Airtable field names in formulas are case-insensitive but must match

### Steps
1. **Database migration**: `TRUNCATE public.placements_archive;` to clear stale data
2. **Fix filter formula** in `placementsService.ts`: change `{date}` → `{Date}` (capital D, no BOM needed in formulas)
3. **Invoke `seed-placements-archive`** to re-populate all ≤2025 records from the new table
4. Verify total count matches expectations (~22,730 total = archive + live 2026 records)

### Files modified
- `src/services/placementsService.ts` — fix filterByFormula field name
- Database migration — truncate archive table

### What stays the same
- `seed-placements-archive` edge function already uses the correct table ID and outlet lookup
- No UI or type changes needed
- Live 2026+ data continues fetching from Airtable directly

