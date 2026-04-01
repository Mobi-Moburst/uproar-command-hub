

## Plan: Switch Outlet field from "Outlet (Unlinked)" to "Outlet (Linked)"

### What changed
Airtable renamed the old "Outlet" column to "Outlet (Unlinked)" and a new "Outlet (Linked)" column was created across all three tables (Placements, Samples, Briefings). We need to update every mapper to read from the new field name.

### Impact points (4 files)

**1. `src/services/mappers.ts`** — 3 mappers to update
- `mapPlacement` (line 31): Change `f["Outlet"]` → `f["Outlet (Linked)"]` (keep `f["outlet"]` as DB fallback)
- `mapSample` (line 117): Same change
- `mapBriefing` (line 138): Same change

**2. `supabase/functions/seed-placements-archive/index.ts`** (line 38)
- Change `f["Outlet"]` → `f["Outlet (Linked)"]`

**3. `supabase/functions/airtable-proxy/index.ts`** — no changes needed (passes raw fields through)

**4. `src/services/placementsService.ts`** — no changes needed (reads from DB column `outlet`, not Airtable field names)

### Why this is safe
- The DB column is still called `outlet` — no database migration needed
- The app's TypeScript interfaces still use `outlet` — no UI changes needed
- Only the Airtable field name mapping changes in the 4 locations above
- The `f["outlet"]` lowercase fallback in mappers handles the archived DB rows

### Summary
This is a 2-file edit (mappers.ts + seed function) touching 4 lines total. No UI, database, or type changes required.

