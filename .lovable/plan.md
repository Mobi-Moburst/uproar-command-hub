

## Plan: Resolve Outlet Linked Record IDs to Names

### Problem
"Outlet (Linked)" is a linked record field returning record IDs (e.g. `recXXX`) instead of outlet names.

### Solution
Use the same pattern as Awards clients: fetch the Outlets table, build an ID→name lookup map, and resolve names in mappers.

### Changes

**1. `src/services/airtable.ts`**
- Add `outletsTable: "tbl65cHPi8TIHTfpT"` to `TABLE_IDS`

**2. `src/services/mappers.ts`**
- Update `mapPlacement`, `mapSample`, `mapBriefing` to accept an optional `outletLookup?: Map<string, string>` parameter
- Resolve the linked record ID to the outlet name using the lookup map, falling back to the raw value

**3. `src/services/placementsService.ts`**
- Fetch the Outlets table alongside live placements
- Build `Map<recordId, outletName>` from the fetched records
- Pass the lookup to `mapPlacement()`

**4. `src/services/samplesService.ts`**
- Same: fetch Outlets table, build lookup, pass to `mapSample()`

**5. `src/services/briefingsService.ts`**
- Same: fetch Outlets table, build lookup, pass to `mapBriefing()`

**6. `supabase/functions/seed-placements-archive/index.ts`**
- Fetch Outlets table from Airtable directly in the edge function
- Build lookup and resolve outlet names before upserting to DB

### Files modified
- `src/services/airtable.ts` — add table ID
- `src/services/mappers.ts` — add outlet lookup param to 3 mappers
- `src/services/placementsService.ts` — fetch outlets, pass lookup
- `src/services/samplesService.ts` — fetch outlets, pass lookup
- `src/services/briefingsService.ts` — fetch outlets, pass lookup
- `supabase/functions/seed-placements-archive/index.ts` — fetch outlets, resolve names

No database changes needed.

