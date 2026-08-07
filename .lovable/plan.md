# Pitch Pipeline

Turn the empty Pitch Pipeline tab into the place where a campaign goes from media list to pitched reporter to HubSpot ticket — with client guardrails and coverage history acting as a safety check on every draft.

**Governing principle:** HubSpot is the system of record. Reporters are written to HubSpot at **import**, not at send. The dashboard reads state from HubSpot; it never holds an independent source of truth.

## The workflow

```text
1. Create a campaign      Client + angle + optional press release
2. Import a media list    Muck Rack CSV/XLSX -> upserted into HubSpot immediately
3. Review contacts        Badges: recently pitched / do-not-pitch / already covered
4. Draft pitches          AI per-contact, or bulk with per-contact merge
5. Approve + send         Human approves; ticket created; sent via connected inbox
6. Track                  Board reads ticket stage from HubSpot
```

## 1. Campaigns

A campaign is one client plus one angle — "Jeff's Bagel Run / National Bagel Day". Created from the Pitch Pipeline tab, or straight from a Pulse signal or a "fresh angle" from the coverage brief.

Each campaign shows the client's do-not-pitch list, saturated topics from the last 90 days, and the angle being worked. Optionally attach a press release for bulk pitching.

## 2. Muck Rack import — writes through to HubSpot

Drag a Muck Rack CSV or Excel export onto the campaign. For each parsed row:

1. **Match on email, portal-wide.** The email is normalised (lowercase, trimmed) and searched across the whole HubSpot portal — not scoped to the current user or campaign — so a contact someone else imported last month is found and reused. No match, create.
2. **Stamp the PR firewall fields, additively.** `pr_contact = true` and `contact_source = "Import"` are safe to re-set every time. Outlet, `beats__topics_covered` and `journalist_tier` fill only if empty, and multi-value beats union rather than replace. An existing owner, lifecycle stage, or any populated field is never overwritten by a blank cell from the file.
3. Store `hubspot_contact_id` on the campaign contact row and associate the contact to this campaign. A second campaign adds a second association — never a second contact.

The importer previews the first rows, auto-maps common Muck Rack columns (Name, Outlet, Email, Beat, Title, Location) with manual override dropdowns, flags rows with no email, and de-dupes within the file.

### De-duplication across users and campaigns

- **Email is the primary key.** The portal-wide search before every create is what makes one user's import reuse the contact another user created. HubSpot also enforces email uniqueness at the API, so if two imports race on the same email the second create returns a conflict — handled by re-fetching by email and using that record. An emailed reporter cannot end up duplicated.
- **Email-less rows are the one gap.** Muck Rack exports often omit email and HubSpot only enforces uniqueness on email, so the same email-less reporter imported twice would otherwise create two records. Before creating one, a secondary match on name + outlet (plus social handle when present) runs, and any hit is surfaced as "possible duplicate — link to this contact, or create new?". Fuzzy matches are never auto-merged.

Writing at import applies the sales firewall the moment a reporter enters the system, and is what makes the "recently pitched" badge possible — the shared contact carries one `last_pitched_date` visible to everyone.

Muck Rack has no accessible API on standard plans, so file import is the supported path.

## 3. Conflict warnings

Badges appear on each contact row the moment the list is imported. Three come from data already in this dashboard, three from the HubSpot read that happens during import:

**From the dashboard:**
- **Already covered us** — reporter or outlet appears in the client's placements within 90 days
- **Guardrail conflict** — the angle touches something on the client's do-not-pitch list
- **Repeat topic** — the angle overlaps a saturated theme from the coverage brief

**From HubSpot:**
- **Recently pitched** — `last_pitched_date` within 30 days (configurable), checked across every campaign and team; also flags `is_podcast_outreach_contact = true` so the podcast team's contacts are visible
- **Do Not Pitch** — `media_relationship_status = "Do Not Pitch"`
- **Owned by sales** — contact exists with a non-PR owner

Nothing blocks. Warnings make the risk visible, and any contact can be excluded from the campaign in one click.

## 4. Pitch drafting

- **Custom per contact** — AI writes a personalised pitch from the angle, the reporter's beat/outlet, the client's tone preferences, and the client's guardrails. Fully editable.
- **Bulk** — one pitch template for press-release announcements, rendered and sent **per contact** with merge tokens. Never one shared email to many recipients.

**Guardrail authority:** the primary source is an explicit, structured per-client do-not-pitch list maintained in the app. Guardrails mined from client emails (`client_comms_intel`) stay as a **soft** signal — labeled "inferred from emails" and never the sole basis for flagging a draft.

## 5. Sending — sequence enrolled by a HubSpot workflow

Pitches go out through a **HubSpot sequence**, and enrollment is performed by a **HubSpot workflow** — the same enroll-in-sequence action the sales team already uses — not by the app. The action is set to **send as Contact Owner**, so each pitch goes 1:1 from the owning PR person's connected inbox, with opens and replies threading back onto the contact automatically. The sending PR user needs a Service Hub Enterprise seat with a connected inbox.

Because "send as Contact Owner" drives the sender, the **Contact Owner on a `pr_contact` record must be the PR person doing the outreach**. That is safe here: the firewall keeps sales off journalist records, so nothing competes for the owner field.

- At enroll time the app sets **Contact Owner = the enrolling PR user**, then flips the enrollment trigger. With the per-contact lock below there is only ever one active pitcher, so the owner never thrashes.
- The custom `pr_owner` field becomes redundant for journalists — dropped in favour of native Contact Owner, or kept only as a synced alias.

App-side flow (no sequence API call):

- Write the approved pitch to `pitch_body`, set Contact Owner = enrolling PR user, and set the enrollment trigger (property flip or list add) — all in the same step.
- The HubSpot workflow enrolls the contact into the one shared PR sequence, sending as Contact Owner. The body rides the `{{ contact.pitch_body }}` token.
- The sequence owns follow-up cadence and auto-unenrolls on reply, so the app builds no follow-up scheduler.

Rules:

- **Human approve-then-enroll is mandatory.** Nothing auto-sends; drafts stay editable until approval.
- Bulk enrollment respects HubSpot's per-user daily sequence send cap.
- **Write-back on enroll:** `last_pitched_date` is stamped to today, and a `media_relationship_status` of New advances to Warm. Without this write the "recently pitched" badge never fires for anyone.

Explicitly not using sales email one-offs. Because sequences log their own sends, `crm.objects.emails.write` is likely unnecessary — confirmed before phase 3 ships rather than requested up front.

### Deferred until multi-user rollout

The shared `pitch_body` token is safe for one user testing sequentially, but has a concurrency flaw at 20+ users. These get resolved before rollout, not before testing:

1. **Per-contact enrollment lock** — only one active PR enrollment per reporter at a time, promoting the "recently pitched / in conversation" badge to a hard block. Makes the shared property safe and is correct PR hygiene anyway.
2. **Verify token-resolution timing** — confirm whether HubSpot renders `{{ contact.pitch_body }}` at enrollment (snapshot) or at each send (live re-read). If live re-read, the body must be made immutable per send instead.
3. **Contact Owner assignment** — settle how native Contact Owner is set on journalist records (recommended: at enroll, to the current pitcher) and reconcile with `pr_owner`.

Phases 1-2 need none of this; drafting can stay copy-to-clipboard until the above is settled.

## 6. Tickets

- **One ticket per reporter per campaign**, on pipeline **Uproar Client Pitching**.
- **Created at approval into outreach**, not at import — untouched imported rows never clutter the board.
- Named `{client} / {angle} — {reporter}`, associated to the reporter's contact record and the client's company.

```text
Researching → Ready to Pitch → Pitched → Following Up →
In Conversation → Committed → Published (Won) / Closed Lost
```

## 7. Stage sync — HubSpot is canonical

- The board **reads** stage from HubSpot and caches it for display, refreshing on load and after every write.
- Dragging a card **writes to HubSpot, then refetches**. There is no local stage store that can drift.
- Enrolling a contact into the sequence advances the ticket to **Pitched** in HubSpot.
- **Write-back on Won:** when a ticket enters **Published (Won)**, the user is prompted for the published clip URL; `last_coverage_date` is stamped to today and the link stored on the contact. This feeds the "already covered us" badge and builds owned coverage history over time.
- No bidirectional sync loop.

## 8. Outside the app: two HubSpot workflows (RevOps)

**Workflow A — the firewall:**

- **Trigger:** `pr_contact = true` OR `is_podcast_outreach_contact = true`
- **Actions:** set the contact to non-marketing; add to the suppression list "Outreach Contacts — Exclude from Sales/Marketing"

Sales sequences and marketing sends exclude that list. The app does not set non-marketing status itself.

**Workflow B — PR sequence enrollment:** mirrors the existing sales enroll-in-sequence action. Triggers on the app's enrollment signal (§5), enrolls the contact into the shared PR sequence, **send as Contact Owner**.

The two stay distinct — one firewalls sales and marketing, the other runs PR outreach.

## Build order

Each phase is usable on its own:

1. **Campaigns + Muck Rack import + HubSpot upsert + conflict review** — the import already touches HubSpot, so contacts and badges are real from day one
2. **AI pitch drafting** (custom + bulk), copy-to-clipboard
3. **Approve → ticket creation → sequence enrollment → stage read**
4. **Kanban board and cross-client pipeline view**

## Technical notes

**Database (Lovable Cloud):**
- `pitch_campaigns` — client_name, angle, description, press_release_body, status, created_by
- `pitch_contacts` — campaign_id, name, outlet, email, beat, title, location, `source_row` (raw import snapshot), `hubspot_contact_id`, `hubspot_ticket_id`, `stage_cache` (display only, reconciled from HubSpot), `warnings` jsonb, excluded
- `pitch_drafts` — contact_id, subject, body, mode (custom/bulk), status (draft/approved/sent), sent_at
- `client_pitch_guardrails` — client_name, rule, scope (topic/outlet/reporter), created_by — the explicit do-not-pitch list from §4
- RLS: authenticated read/write, with GRANTs on every table.

**Edge function `pitch-hubspot` — contracts:**
- `load-pipeline` — GET `/crm/v3/pipelines/tickets/923698812`, builds a `{ label → stageId }` map, cached. Every stage write resolves through this map; **no hardcoded stage IDs**, so renames and reorders self-heal. Sanity anchor: Researching resolves to `1414076054`.
- `find-or-create-contact` (import) — in: parsed row. out: `hubspot_contact_id`, `matched`, plus the signal fields for the conflict badges. Implements the de-dup logic above: portal-wide email match, conflict re-fetch on race, and the name+outlet secondary match surfaced for review on email-less rows.
- `conflict-check` (import) — in: contact ids. out: warnings[].
- `create-ticket` (approval) — in: campaign, contact id. out: `hubspot_ticket_id`, stage resolved through the pipeline map.
- `approve-and-arm` (approval) — in: approved draft, contact id, enrolling PR user. Writes `pitch_body`, sets Contact Owner to that PR user, flips the enrollment trigger (property or list), advances the ticket to Pitched, and stamps `last_pitched_date` (plus New → Warm). The HubSpot workflow performs the actual enrollment and sends as Contact Owner — the app calls no sequence API.
- `set-stage` (drag or programmatic) — in: ticket id, target stage label. Writes via the pipeline map, then refetches. On entering Published (Won), also writes `last_coverage_date` and the clip URL to the contact.
- `read-stages` (board load / after write) — in: ticket ids. out: current stages.

**Edge function `pitch-draft`** — Gemini via Lovable AI. Inputs: angle, contact, `client_pitch_guardrails` (hard), `client_comms_intel` guardrails (soft/inferred), `client_coverage_intel` themes.

**Parsing:** CSV/XLSX read client-side with SheetJS; only mapped rows are persisted, no file upload to storage.

**HubSpot scopes needed on the connection key (phase 1 onward, since import writes):** `crm.objects.contacts.read`, `crm.objects.contacts.write`, `tickets`. No sequence scope is needed — enrollment happens inside a HubSpot workflow, not via the API. Explicitly **not** `sales-email-write`; `crm.objects.emails.write` only if sequences turn out not to log their own sends. If the current key is missing any, it gets regenerated in HubSpot with them before phase 1 ships.

**Verified live (Aug 2026):** pipeline `923698812` exists with the 8 stages above and currently holds 0 tickets; contact, ticket, and email objects are writable on the connection; the `pr_contact`, `pr_owner`, `media_relationship_status`, `journalist_tier`, `beats__topics_covered`, `last_pitched_date`, `last_coverage_date`, `contact_source`, `pitch_preferences__notes`, and `is_podcast_outreach_contact` fields already exist on the contact object.
