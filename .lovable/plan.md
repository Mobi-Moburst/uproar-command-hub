# Pitch Pipeline

Turn the empty Pitch Pipeline tab into the place where a campaign goes from media list to pitched reporter to HubSpot ticket — with the client guardrails and coverage history already in the dashboard acting as a safety check on every draft.

## The workflow

```text
1. Create a campaign      Client + angle + optional press release
2. Import a media list    Drop a Muck Rack CSV/XLSX export
3. Review contacts        Auto-flagged: already covered / guardrail conflict
4. Draft pitches          AI per-contact, or one bulk pitch for a release
5. Approve + send         Sends through HubSpot, logged on the contact
6. Track                  Tickets on "Uproar Client Pitching", stages sync back
```

## 1. Campaigns

A campaign is one client plus one angle — "Jeff's Bagel Run / National Bagel Day". Created from the Pitch Pipeline tab, or straight from a Pulse signal or a "fresh angle" suggested by the coverage brief, so the intelligence already built feeds directly into outreach.

Each campaign shows: the client's guardrails ("do not pitch"), the topics already saturated in the last 90 days, and the angle being worked. Optionally attach a press release for bulk pitching.

## 2. Muck Rack import

Drag a Muck Rack CSV or Excel export onto the campaign. The importer:

- Reads the file in the browser, shows a preview of the first rows
- Auto-maps common Muck Rack columns (Name, Outlet, Email, Beat, Title, Twitter, Location) with a manual override dropdown for anything it can't guess
- Flags rows with no email address, and de-dupes against contacts already on the campaign
- Saves the parsed contacts to the campaign

Muck Rack has no accessible API on standard plans, so file import is the supported path. Paste-a-list can be added later if useful.

## 3. Conflict warnings before anything is drafted

Every imported contact gets checked against what the dashboard already knows, and problems surface as visible badges on the contact row:

- **Already covered us** — this reporter or outlet appears in the client's placements within 90 days
- **Guardrail conflict** — the angle or the reporter touches something the client said not to do in their HubSpot emails
- **Repeat topic** — the angle overlaps a saturated theme from the coverage brief

Warnings don't block anything, they just make the risk visible. Contacts can be excluded from the campaign in one click.

## 4. Pitch drafting

Two modes:

- **Custom per contact** — AI writes a personalised pitch using the angle, the reporter's beat/outlet/recent coverage, the client's tone preferences, and the client's guardrails. Fully editable before sending.
- **Bulk** — one pitch body for the whole list (press release announcements), with light per-contact personalisation of the greeting and first line.

If a draft would violate a guardrail, the AI is told not to write it that way, and the contact row shows why.

## 5. Sending through HubSpot

Approved pitches send via HubSpot so opens, replies, and the full thread land on the contact record automatically — no separate tracking to maintain.

Before first send: HubSpot needs a "from" address connected, and the app needs contacts to exist in HubSpot. Imported reporters not already in the CRM get created as contacts on send.

## 6. HubSpot tickets

Each contact pitched becomes its own ticket on the **Uproar Client Pitching** pipeline, which already exists in your HubSpot with these stages:

```text
Researching → Ready to Pitch → Pitched → Following Up →
In Conversation → Committed → Published (Won) / Closed Lost
```

The ticket is named for the client + angle + reporter, associated to the reporter's contact record and the client's company. The dashboard advances the stage automatically on send (Pitched), and stages changed in HubSpot sync back into the board view. Users can also drag a card between stages in the dashboard.

## The board

The main Pitch Pipeline view is a kanban board of every open pitch across all clients, grouped by stage, filterable by client, campaign, or owner — so anyone can see what's in flight, what's gone quiet, and what converted.

## Suggested build order

Each phase is usable on its own:

1. **Campaigns + Muck Rack import + contact review with conflict warnings** — immediate value, no HubSpot writes yet
2. **AI pitch drafting** (custom + bulk), copy-to-clipboard
3. **HubSpot send + ticket creation + stage sync**
4. **Kanban board and cross-client pipeline view**

## Technical notes

**Database (Lovable Cloud):**
- `pitch_campaigns` — client_name, angle, description, press_release_body, status, created_by
- `pitch_contacts` — campaign_id, name, outlet, email, beat, title, location, source_row (raw import), hubspot_contact_id, hubspot_ticket_id, stage, warnings jsonb, excluded
- `pitch_drafts` — contact_id, subject, body, mode (custom/bulk), status (draft/approved/sent), sent_at
- RLS: authenticated read/write; GRANTs on all three.

**Edge functions:**
- `pitch-draft` — Gemini via Lovable AI; inputs = angle, contact, `client_comms_intel` guardrails, `client_coverage_intel` themes. Streams the draft.
- `pitch-hubspot` — actions: `ensure-contact`, `send-email`, `create-ticket`, `sync-stages`. Uses the existing HubSpot gateway connection; ticket pipeline `923698812`.

**Parsing:** CSV/XLSX read client-side (SheetJS), no upload to storage needed — only the mapped rows are persisted.

**Conflict engine:** pure frontend comparison of imported contacts against `usePlacements()` (90-day slice) and the cached comms/coverage briefs. No extra API cost.

**Scope check:** HubSpot email sending requires the connection's key to carry `sales-email-write` / `crm.objects.contacts.write` / `tickets` scopes. If the current key lacks them, the key gets regenerated in HubSpot with those scopes before phase 3 — phases 1 and 2 don't need them.
