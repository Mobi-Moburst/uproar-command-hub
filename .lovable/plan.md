# Import write-back: Contact Owner + Lifecycle Stage

## What changes

When a media list is imported, every contact written to the CRM will also get:

1. **Contact Owner = the person doing the import.** The importing user's login email is matched against the CRM owner list to find their owner record. Set on create, and re-set on every update so the owner always reflects the most recent person to touch the contact.
2. **Lifecycle Stage = "Other"**, set on both create and update.

If the importing user's email has no matching owner in the CRM (they aren't a seated user there), the contact is still imported — owner is left as-is and the row gets a small "Owner not set" note so it's visible rather than silent.

## Yes — this conflicts with two earlier rules

You asked me to flag conflicts, so:

1. **"Never overwrite an existing owner."** The original spec said the import must never touch an existing owner field. Your new rule does exactly that. I'll follow the new rule: owner is always overwritten by the importer. Worth knowing this means if a sales rep owned a journalist record, the import silently takes it over. The "Owned by sales" badge is computed from the *pre-import* state, so you'll still see the warning on that row — but the takeover will already have happened.
2. **"Never overwrite lifecycle stage."** Same situation. Lifecycle now always gets forced to Other.

A third, softer one: the later spec set Contact Owner at *enroll* time (so a sequence sends from the pitcher's inbox). That still works — enroll simply re-stamps the owner. Importer owns it until someone actually pitches. No change needed there, just noting the field gets written twice in the lifecycle.

Everything else stays additive: name, outlet, title, tier are still fill-only-if-empty, and beats are still merged.

## Technical notes

- `supabase/functions/pitch-hubspot/index.ts`:
  - Resolve the caller's email from the authenticated Supabase user (already available in the handler).
  - Reuse the existing `getOwners()` cache, adding an email-keyed lookup (lowercased) to map that email to a HubSpot owner id.
  - In `buildPatch`, add `lifecyclestage: "other"` unconditionally, and `hubspot_owner_id` unconditionally when the owner id resolved.
  - Pass the resolved owner id through `findOrCreateContact` (both the create and PATCH paths).
  - When no owner matches, push a `warnings` entry of kind `owner_unmatched`.
- `src/components/pitch/PitchContactsTable.tsx`: render the new warning kind with the existing badge styling.
