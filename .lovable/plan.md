# Reporter Directory: Airtable-first, HubSpot as enrichment

Fix the "No reporters found" problem in Pulse by building a real reporter directory from Uproar's own coverage history, then enriching those people with HubSpot contact details where a match exists. HubSpot media contacts that Uproar has never worked with are ignored.

## Why this direction

The 1,063 media contacts in HubSpot are almost entirely unattributed to the Uproar team — Sales/Kitcaster-owned or stale. Pitching from that list would surface people no one on the team knows. Airtable placements are the opposite: every reporter there represents real, earned coverage.

So: Airtable is the source of truth for *who*. HubSpot is a lookup for *how to reach them*.

## Step 1 — `reporter_directory` table

One row per reporter+outlet, built from placements.

Columns: `id`, `reporter_key` (unique, `lower(name)|lower(outlet)`), `name`, `outlet`, `beats text[]`, `placement_count`, `last_coverage_date`, `clients_covered text[]`, `top_headlines jsonb`, plus enrichment fields `email`, `job_title`, `linkedin_url`, `hubspot_contact_id`, `hubspot_matched_at`, `last_synced_at`.

Authenticated read; service-role write. Standard GRANTs + RLS.

## Step 2 — Build the directory from Airtable + archive

Edge function `sync-reporter-directory`:
- Reads `placements_archive` (2025 and earlier) plus live Airtable placements via the existing proxy.
- Groups by reporter+outlet, aggregating count, beats (from vertical/topic), clients covered, most recent 3 headlines, last coverage date.
- Upserts on `reporter_key`. Idempotent, safe to re-run.
- Run manually now; weekly cron after.

This alone gives the matcher a clean, deduped pool it currently has to recompute on every call.

## Step 3 — Cross-reference against HubSpot

Second pass in the same function (or a separate `enrich-reporters-hubspot` so it can run independently):

- For each directory row without `hubspot_contact_id`, search HubSpot contacts by name, scoped to media job titles.
- Confirm a match only when **name matches AND** the outlet lines up with the contact's company or email domain. Name-only matches are skipped — false positives are worse than blanks here.
- On match, write `email`, `job_title`, `linkedin_url`, `hubspot_contact_id`, `hubspot_matched_at`.
- Report coverage back: how many of N directory reporters got a HubSpot hit. That number tells you whether HubSpot is worth keeping in the loop at all.

Batched and rate-limit aware; HubSpot search is 4 req/sec.

## Step 4 — Point the Pulse matcher at the directory

In `pulse-scan` and `pulse-match-reporters`, replace `findInternalCandidates`' live `placements_archive` scan with a `reporter_directory` query:

- Token-match the signal's industry + client keywords against `beats` (array overlap) rather than the current full-phrase `ilike`, which is why matches come back empty.
- Boost reporters who have already covered this client.
- Guaranteed fallback: if beat matching yields nothing, return the client's own top historical reporters. The matcher should never return an empty list.
- Keep web discovery as a supplement for net-new names, unchanged.
- Attach `email` to the candidate when enrichment found one.

## Step 5 — UI

- Reporter rows in `PulsePage.tsx`: show contact email with a copy button when known; small "In HubSpot" indicator otherwise absent.
- Replace the "No reporters found" dead end with a message pointing at the client's enrichment keywords, since weak keywords are the usual cause.
- Optional follow-up: a Reporters page view backed by the directory, so the team can browse and search it directly.

## Technical details

- HubSpot calls go through the existing gateway connection from edge functions only.
- `reporter_key` matches the matcher's existing `sha1(name|outlet)` convention so IDs stay stable across sources.
- Beats stored as a text array with a GIN index for overlap queries.
- One migration: `reporter_directory` + indexes on `reporter_key`, `outlet`, and `beats`.

## Out of scope

- Pitch → coverage / reply rate metrics (HubSpot has no logged PR outreach).
- Importing HubSpot media contacts Uproar has no coverage history with.
- Writing back to HubSpot from the app.
