# Client page + HubSpot account context

HubSpot is strong on the account side (companies, contacts, deals, activity) — exactly what the Clients page is missing.

## Match coverage (verified across all 42 clients)

- 30 of 42 (71%) match cleanly on exact name with matching domains.
- 2 more resolve with a one-click manual pick (near-name variants).
- The remaining 10 are genuinely absent from HubSpot — no fuzzy logic recovers them.

That clears the 70% bar, so the build proceeds.

## What gets added to the Clients page

Each client detail panel gains a **HubSpot context** section:

- **Account** — company name, domain, lifecycle stage, industry, account owner, and a "View in HubSpot" link to the record.
- **Key contacts** — client-side contacts on the company (name, title, email).
- **Deals** — open and closed-won deals: name, stage, amount, close date.
- **Last activity** — most recent logged engagement date, so a stale account is visible at a glance.
- **Link state** — clients with no company get a clear, non-alarming state plus a way to fix it.

## Linking flow for non-technical users

Anything we can't confidently match shows a quiet badge: **"Not linked to CRM"**. No error styling, no jargon.

Clicking it opens a lightweight sheet asking one plain question: *"Which company is Gentex in HubSpot?"*

- 3–5 suggestion cards, pre-fetched: company name, domain, city, owner, and how many contacts/deals are attached — enough to recognize it without knowing HubSpot.
- Each card has a small **View in HubSpot** link (new tab) so they can validate on the HubSpot side before choosing. Clicking the link does not select the card.
- A search box at the top for typing a different name if none fit.
- A **"This client isn't in HubSpot"** button that records the decision permanently, so it stops asking.

Once linked, the panel header shows the linked company name with **View in HubSpot** next to it, plus a small **Change** action to relink if someone picks wrong.

No record IDs, no pasted URLs, no leaving the app — they are recognizing a company name they already know. Realistically a five-minute cleanup pass the first time someone opens the page, then it's permanent.

## How it's built

**1. Link the HubSpot connector to this project.** Currently reachable only from chat, not from app code. One-click connect step.

**2. `client_hubspot_links` table** — one row per client: `client_name` (unique), `hubspot_company_id`, `match_confidence`, `matched_by` (auto/manual/none), `linked_at`. `matched_by = 'none'` records the "not in HubSpot" decision. Authenticated read/write, service-role full, standard GRANTs and RLS.

**3. `client_hubspot_snapshot` table** — cached account context per client: company name, domain, lifecycle stage, industry, owner name, contacts jsonb, deals jsonb, last activity date, `synced_at`. The page must never make live HubSpot calls per client on render.

**4. `hubspot-match-clients` edge function** — searches companies by name then domain, auto-links high-confidence matches, and stores ranked suggestions for the rest so the picker opens instantly.

**5. `hubspot-sync-clients` edge function** — for every linked client, pulls company properties, associated contacts, and associated deals, then upserts the snapshot. On demand from the UI plus a daily refresh.

**6. UI** — `ClientHubspotPanel` in the client detail area reading the snapshot via a `useClientHubspot` hook, plus `ClientHubspotLinkSheet` for the picker. Includes a "Sync now" action.

## Technical notes

- All HubSpot calls run server-side through the connector gateway from edge functions.
- HubSpot record URLs are built from the portal ID plus record ID; they require a HubSpot seat, so the panel stays fully self-sufficient without clicking through.
- Contacts pulled via company associations only.
- Deal amounts are internal-sensitive; the deals block is gated so view-only seats see account and contact context but not amounts.

## Out of scope

- Writing anything back to HubSpot.
- Media/reporter contacts — separate reporter directory work.
- Pitch and email engagement metrics — not reliably logged in HubSpot.
