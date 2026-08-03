# HubSpot Media Contacts → Pulse Reporter Matcher

Fix the "No reporters found" problem by adding a third candidate source: the 1,063 media contacts already sitting in HubSpot. Pitch Intelligence stays "Coming Soon" — the outreach data isn't there.

## Why this

Today the matcher has two sources:
- **Internal** — `placements_archive`, matched with literal `ilike` on vertical/topic. Too strict, usually returns nothing.
- **Web** — Firecrawl search, but most results have no author metadata, so they get dropped.

HubSpot gives a clean, pre-qualified list: real people, real outlets, job titles like reporter/editor/producer. That's the missing middle layer.

## Step 1 — Media contact cache table

New table `media_contacts`, synced from HubSpot (not queried live — 1,063 contacts is one sync, not a per-signal API call).

Columns: `id`, `hubspot_id`, `name`, `email`, `outlet`, `job_title`, `beats text[]`, `linkedin_url`, `last_synced_at`, `source` ('hubspot' | 'airtable').

Authenticated read; service-role write. Standard GRANTs + RLS.

## Step 2 — Sync edge function

`hubspot-sync-media-contacts`:
- Searches HubSpot contacts with `CONTAINS_TOKEN` on job title (reporter, editor, journalist, producer, correspondent, writer, host, contributor).
- Normalizes outlet from company field, falling back to email domain.
- Derives `beats` from HubSpot lifecycle/industry properties where present.
- Upserts on `hubspot_id`.
- Run manually now, and on a weekly cron afterward.

## Step 3 — Broaden internal matching

Current `findInternalCandidates` requires a literal substring hit on `vertical` or `topic_product`. Loosen it:
- Tokenize the signal's industry + client keywords into individual words; drop stopwords.
- Match on any token, not the full phrase.
- Add `headline` to the searched columns.
- If still empty, fall back to the client's own historical reporters (any placement for that client), which are always relevant even if the beat text doesn't line up.

## Step 4 — Merge HubSpot into the candidate pool

In both `pulse-match-reporters` and `pulse-scan`:
- Query `media_contacts` for outlet/beat/title overlap with the signal.
- Merge into the pool alongside internal + web, deduping on the existing `sha1(name|outlet)` reporter ID.
- When a HubSpot contact matches an internal reporter, keep the internal stats and attach the HubSpot email/title — best of both.
- New `source` value: `"hubspot"`.
- Guarantee a non-empty pool: if all three sources come back empty, return the client's top historical reporters rather than nothing.

## Step 5 — UI

On the reporter rows in `PulsePage.tsx`:
- Add a **HubSpot** source tag next to the existing Internal/Web tags.
- Show the contact email when known, with a copy button.
- Replace the "No reporters found" dead end with a short explanation plus a link to the client's enrichment keywords, since weak keywords are the usual cause.

## Technical details

- HubSpot access goes through the existing gateway connection (`hubspot` connector) from edge functions only.
- Reporter ID stays `sha1(lower(name)|lower(outlet)).slice(0,12)` so dedupe holds across sources.
- Sync is idempotent; re-running only refreshes `last_synced_at` and changed fields.
- No change to the AI ranking pass — it just receives a richer candidate list.
- One migration: `media_contacts` table + indexes on `outlet` and `hubspot_id`.

## Out of scope

- Pitch → coverage / reply rate metrics (HubSpot has no logged PR outreach).
- Writing back to HubSpot from the app.
- Contact enrichment from third-party media databases.
