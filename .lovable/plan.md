# Pitch Pipeline — Phase 3 (approve → ticket → enroll → stage) + Phase 4 (board)

Phases 1–2 are live: campaigns, media-list import with additive CRM upsert, conflict
badges, AI drafting with voice profiles. This plan builds the send-and-track half,
with HubSpot as the system of record for both ticket stage and outreach state.

## What the user will see

1. **Approve → Arm for send.** In the draft sheet, Approve gains a second step:
   "Approve & arm". It creates the reporter's ticket, writes the approved body onto
   the CRM contact, makes the approving user the contact owner, and flips the
   enrollment trigger. The HubSpot workflow does the actual sequence enrollment and
   sends as contact owner — nothing is ever auto-sent from the app.
2. **Stage on the contact row.** Each contact in the campaign table shows its live
   ticket stage, refreshed on load and after every write.
3. **Pitch board.** A kanban across all campaigns with the eight pipeline columns.
   Dragging a card writes the stage to HubSpot and refetches. Dropping into
   Published (Won) prompts for the clip URL, which is stamped back on the contact.

## Behaviour rules

- Ticket is created at approval, never at import. One ticket per reporter per campaign,
  named `{client} / {angle} — {reporter}`, associated to the reporter contact only.
  Client is carried on the ticket's `pr_client` text property — no company or deal
  association.
- Stage IDs are always resolved from the live pipeline (`923698812`) label→ID map,
  cached per function instance. Nothing hardcoded; sanity check that
  Researching resolves to `1414076054`.
- HubSpot stage is canonical. The local `stage_cache` column is display only and is
  overwritten from HubSpot on every read; no local writes that can diverge.
- On arm: stamp `last_pitched_date = today`, advance `media_relationship_status`
  New → Warm, set contact owner to the arming user, advance ticket to Pitched.
- On Won: prompt for clip URL, stamp `last_coverage_date = today` and store the link
  on the contact.
- If the arming user has no CRM owner record, block arming with a clear message —
  the sequence sends as contact owner, so an unresolved owner would send as nobody.
- Concurrency safeguards (per-contact enrollment lock, immutable per-send body) are
  deferred to multi-user rollout as the spec states; the solo test build uses the
  shared `pitch_body` token.

## Technical notes

`supabase/functions/pitch-hubspot/index.ts` gains actions, reusing the existing
`hs()` gateway helper, `loadPipeline()` map and `ownerIdForEmail()`:

- `create-ticket` — POST `/crm/v3/objects/tickets` with `hs_pipeline`,
  `hs_pipeline_stage` (label→ID), `subject`, `pr_client`; then contact association
  (`/associations/contacts/{id}/contact_to_ticket`). Returns `hubspot_ticket_id`.
- `approve-and-arm` — resolves owner from the caller's login email, PATCHes the
  contact (`pitch_body`, `hubspot_owner_id`, `pr_pitch_ready` trigger flag,
  `last_pitched_date`, New→Warm), creates the ticket if absent, moves it to Pitched,
  persists `hubspot_ticket_id`/`stage_cache` on `pitch_contacts`.
- `set-stage` — PATCH ticket stage via the map, refetch, return current stage; Won
  branch also PATCHes `last_coverage_date` and the clip URL onto the contact.
- `read-stages` — batch read `/crm/v3/objects/tickets/batch/read` for ticket ids,
  returns id→stage label, used to refresh `stage_cache`.

Frontend:

- `src/hooks/usePitchPipeline.ts` — add `useApproveAndArm`, `useSetStage`,
  `usePitchBoard` (all campaigns' contacts + drafts joined), and a stage refresh that
  runs on board/campaign load.
- `src/components/pitch/PitchDraftSheet.tsx` — replace the trailing "sending lands in
  the next phase" note with the arm action, owner-missing warning, and armed state.
- `src/components/pitch/PitchContactsTable.tsx` — stage column driven by `stage_cache`.
- New `src/components/pitch/PitchBoard.tsx` plus a Won clip-URL dialog, rendered on
  `src/pages/PitchPipelinePage.tsx` behind a Campaigns / Board toggle. Drag and drop
  via native HTML5 handlers (no new dependency).

No schema change needed — `hubspot_ticket_id` and `stage_cache` already exist on
`pitch_contacts`.

## Prerequisites on the HubSpot side (outside the app)

These are RevOps setup steps; the app code ships either way but arming stays inert
until they exist:

- Contact properties `pitch_body` (multi-line text) and the enrollment trigger flag,
  plus ticket property `pr_client`.
- The PR sequence-enrollment workflow (trigger on the flag, enroll, send as contact
  owner) and the sales/marketing firewall workflow.
- `tickets` scope on the connection.

I can verify the pipeline map and a live ticket write with a throwaway ticket before
building the board, so we know the writes land.
