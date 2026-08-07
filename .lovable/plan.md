# Client page + HubSpot account context

Yes, this is very doable — and it's a much better fit for HubSpot than the pitch-tracking idea was. HubSpot is genuinely strong on the *account* side (companies, contacts, deals, activity), which is exactly what the Clients page is missing.

## Evidence it will work

I spot-checked 5 of the 42 clients in coverage data against HubSpot companies: 4 matched cleanly (Truecaller, Rapsodo, Pushpay, Rendever) with domains, lifecycle stages, and owners attached. Deals exist with names, stages, amounts, and close dates. So a name/domain match against the client roster should land most of the list.

## What gets added to the Clients page

Each client row/detail panel gains a **HubSpot context** section:

- **Account** — HubSpot company name, domain, lifecycle stage, industry, account owner, link to the record.
- **Key contacts** — the client-side contacts associated with the company (name, title, email), so the team knows who they're actually reporting to.
- **Deals** — open and closed-won deals: name, stage, amount, close date. Gives a revenue/renewal read alongside the SOW data already there.
- **Last activity** — most recent logged engagement date on the account, so a stale account is visible at a glance.
- **Match status** — clients with no HubSpot company get a clear "not linked" state plus a manual link control, rather than silently showing nothing.

## How it's built

**1. Link the HubSpot connector to this project.** Right now HubSpot is only reachable from chat, not from app code. This is a one-click connect step.

**2. `client_hubspot_links` table** — one row per client name: `client_name` (unique), `hubspot_company_id`, `match_confidence`, `matched_by` (auto/manual), `linked_at`. Keeps the mapping stable and lets anyone correct a bad auto-match. Authenticated read/write, service-role full, standard GRANTs and RLS.

**3. `client_hubspot_snapshot` table** — cached account context per client: company name, domain, lifecycle stage, industry, owner name, contacts jsonb, deals jsonb, last activity date, `synced_at`. Caching matters — the page must not make live HubSpot calls per client on render.

**4. `hubspot-match-clients` edge function** — takes the client roster, searches HubSpot companies by name then by domain, auto-links exact and high-confidence matches, leaves ambiguous ones unlinked for manual resolution. Returns a match report so we can see the real coverage across all 42 clients.

**5. `hubspot-sync-clients` edge function** — for every linked client, pulls company properties, associated contacts, and associated deals, then upserts the snapshot. Run on demand from the UI plus a daily refresh.

**6. UI** — a `ClientHubspotPanel` in the client detail area reading the snapshot table via a `useClientHubspot` hook. Includes a "Sync now" action and an inline company picker for unmatched clients.

## Sequence

Match pass first, so you see the real match rate across the roster before we invest in the sync and UI. If it comes back at 30 out of 42, we build the full thing. If it comes back at 8, we rethink.

## Technical notes

- All HubSpot calls run server-side through the connector gateway from edge functions.
- Contacts are pulled via company associations only — no scraping the full contact database.
- Deal amounts are internal-sensitive; the panel is gated so view-only seats see account and contact context but not deal values, unless you'd rather show it to everyone.

## Out of scope

- Writing anything back to HubSpot.
- Media/reporter contacts — that's the separate reporter directory work.
- Pitch and email engagement metrics — still not reliably logged in HubSpot.
