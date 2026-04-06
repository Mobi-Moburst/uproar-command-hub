

## Plan: Update Clips Table ID

The old table ID `tblsFhq3a6NPalO5N` is still in both locations. Updating to `tblw34mWTvuaIUz16` will fix the 403 Airtable error and restore all live data across the app.

### Changes

**1. `src/services/airtable.ts`** (line 10)
- Change `placements: "tblsFhq3a6NPalO5N"` → `placements: "tblw34mWTvuaIUz16"`

**2. `supabase/functions/seed-placements-archive/index.ts`** (line 71)
- Change `const tableId = "tblsFhq3a6NPalO5N"` → `const tableId = "tblw34mWTvuaIUz16"`

Two lines changed, two files. This restores all live placement data across the entire app (placements, reports, intelligence, reporters, clients, teams, weekly wins).

