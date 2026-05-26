## Plan: Capture Weekly Wins history in the database

### The problem
Today the Weekly Wins page reads the **live** Airtable "Weekly Wins" checkbox. The team typically only keeps the flag on for the current (and sometimes prior) week, so as soon as a checkbox gets toggled off in Airtable, that week disappears from the page forever. The archive table also contains zero historical wins, so there's nothing to fall back on.

### The fix (going forward only)
Create a dedicated `weekly_wins` table in the database that **snapshots** any placement flagged as a win in Airtable. Once a row lands there, it stays — even if the Airtable checkbox is later cleared. The Weekly Wins page then reads from this table instead of recomputing from the live flag, giving us a permanent trail that grows week over week.

We will NOT try to backfill old weeks (the historical Airtable signal isn't reliably there). The trail starts from the moment this ships.

### How it works

1. **New table `public.weekly_wins`** — one row per win, keyed by placement id. Columns mirror what the page needs: placement id, date, client, team, outlet, reporter, headline, link, type, vertical, reach, ad value, secured_by, topic_product, notes, plus `captured_at` (when we first saw it) and `week_start` (ISO Monday) for easy grouping.

2. **New edge function `snapshot-weekly-wins`** — pulls every placement currently flagged `Weekly Wins = true` in Airtable, upserts each into `weekly_wins` by id. Idempotent: re-running just refreshes any field changes (e.g. corrected headline) without losing already-captured rows. Safe to invoke manually or on a schedule.

3. **Automatic capture on page load** — when an authenticated user opens the Weekly Wins page, we fire the snapshot function in the background (non-blocking). In practice this means every time the team checks the page, today's flagged wins get persisted. No cron, no extra infrastructure, no Airtable changes required.

4. **Read path switch** — `useWeeklyWins` reads from `public.weekly_wins` instead of filtering live placements. The existing Prev/Next/dropdown UI keeps working unchanged but now navigates a real history.

### What the user will see
- Immediately after shipping: only the currently-flagged weeks show up (same as today).
- After a few weeks: as the team flags and unflags wins normally in Airtable, each week gets locked into the DB. The Prev button and the "Week of…" dropdown start filling in with real historical weeks.
- No workflow change for the Uproar team — they keep using the Airtable checkbox the same way.

### Files / artifacts
- **Migration**: create `public.weekly_wins` (RLS: authenticated read/insert/update, service_role all; no anon).
- **New edge function**: `supabase/functions/snapshot-weekly-wins/index.ts` — fetches Airtable, upserts via service-role client.
- **Edited** `src/services/placementsService.ts` — `getWeeklyWins` now reads from the new table.
- **Edited** `src/hooks/usePlacements.ts` or `src/pages/WeeklyWinsPage.tsx` — fire-and-forget call to the snapshot function on mount.

### Out of scope
- Backfilling historic weeks (no reliable source).
- Changing the Airtable schema or the team's flagging workflow.
- A scheduled cron (can be added later if on-page-load capture proves insufficient).
