

## Fix: Archive placements not loading (showing 2,045 instead of 22,000+)

### Problem
The archive table has 21,281 records but they're not reaching the browser. The `getArchivedPlacements()` function is silently failing — likely because fetching 5,000 rows per request is hitting PostgREST response size limits or timeouts. The fallback returns `[]`, so only the ~2,045 live Airtable records display.

### Solution
Move the heavy data fetch to a backend function (edge function) that uses the service role key and returns the data in a single optimized call, rather than making multiple large REST API requests from the browser.

**However**, a simpler first fix: reduce the page size back to 1,000 (the PostgREST default limit) and select only the columns we need (skipping `notes`, `topic_product`, `created_at`) to reduce payload size. Also add proper error logging so failures are visible.

### Changes

**`src/services/placementsService.ts`**
1. Reduce `pageSize` from 5,000 back to 1,000 (the proven PostgREST limit)
2. Select only needed columns instead of `*` to reduce payload size
3. Add `console.error` with the actual error so we can diagnose if it still fails
4. Remove the outer `try/catch` that silently falls back to mock data — surface the real error

**`src/pages/PlacementsPage.tsx`**
- No changes needed — pagination and filters already work on whatever data loads

### Why this should work
- 1,000-row pages are within PostgREST's default limits and have been proven to work
- Selecting fewer columns reduces each response payload significantly
- ~22 sequential fetches of 1,000 rows is slower than 5 of 5,000, but it will actually complete instead of failing silently

### If it still fails
We'd escalate to an edge function that streams the archive data server-side, but let's try the simple fix first.

