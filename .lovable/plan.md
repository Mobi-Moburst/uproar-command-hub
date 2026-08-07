# Import write-back: Contact Owner, Lifecycle Stage, missing fields

This supersedes the earlier "owner always overwritten" note. The revised spec wins:
import fills a default, enroll sets the real sender.

## Contact Owner — fill only if empty

On import, each contact gets an owner **only when it has none**:

- Match the importing user's login email against the CRM owner list.
- If the contact already has an owner, leave it untouched — a re-import must never
  seize a record or flip the sender off an active pitcher.
- If the importer isn't a seated CRM user, still import the row and show an
  "Owner not set" note on it, so it's visible rather than silent.

Enroll (Phase 3) is the authoritative owner-set: it overwrites Contact Owner to the
enrolling PR user, because the sequence sends as Contact Owner.

## Lifecycle Stage — "Other", but never a demotion

Set Lifecycle Stage to Other on create and update, **unless** the contact is already
Customer, Opportunity, or Sales Qualified Lead — those are real sales relationships and
stay as they are. This keeps journalists out of the lead funnel without stepping on
revenue reporting.

Two things to confirm on the CRM side (outside the app): that "Other" is understood by
RevOps as the PR/journalist stage, and that the "lifecycle stage can't move backwards"
account setting won't reject the write. If that setting blocks it, the write fails
quietly on some rows and we'd surface it as a per-row note.

## Fields currently missed on import

The test run showed these never get written. Adding them, all fill-only-if-empty:

- **Location** (city/state from the media list)
- **Media relationship status** — set to "New" only when blank; never touch an
  existing value, especially "Do Not Pitch"
- **Pitch preferences / notes** — from the notes column when the list has one

Everything else stays as-is: name, outlet, title and tier fill only if empty, beats
merge as a union, and no blank cell ever clears a populated field.

## Technical notes

- `supabase/functions/pitch-hubspot/index.ts`
  - Resolve the caller's email from the authenticated user in the handler.
  - Extend `getOwners()` with a lowercased email → owner id index.
  - `buildPatch(row, existing, ownerId)`:
    - `hubspot_owner_id` only when `!existing?.hubspot_owner_id` and `ownerId` resolved.
    - `lifecyclestage: "other"` unless existing stage is in
      `{customer, opportunity, salesqualifiedlead}`.
    - `city`/location, `media_relationship_status` (default "New"), and
      `pitch_preferences__notes` — each only when the existing value is blank.
  - Push a `warnings` entry `owner_unmatched` when the importer has no owner record.
  - Add `city` (or the portal's location property) to `CONTACT_PROPS` so the
    "is it empty?" check reads real state.
- `src/components/pitch/PitchContactsTable.tsx`: render the `owner_unmatched` badge
  with the existing warning styling.
- `src/components/pitch/MediaListImport.tsx`: pass the notes column through on the
  parsed row if it isn't already mapped.
