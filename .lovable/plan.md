# Uproar Voice Profiles for Pitch Drafting

## The short answer

A Claude skill can't be called by this app at runtime — skills live in the agent that builds the dashboard, not in the app's backend. What we can do is port the *content* of your Uproar voice skill into the dashboard as an editable "voice profile" that gets injected into the pitch drafting prompt. Same effect, and you can edit it without a code change.

## What gets built

**1. Voice profiles storage**

A new table holding voice guidance:
- One global profile ("Uproar house voice") — always applied.
- Optional per-client profiles that layer on top of the global one (client tone notes, words to avoid, preferred structure).

Each profile stores plain markdown — you paste your skill text straight in.

**2. Admin settings page**

New "Voice" section, admin-only (reuses the existing role check):
- Edit the global Uproar voice guide in a large markdown editor.
- Add/edit/delete per-client voice overrides, picked from the existing client roster.
- Shows who last edited and when.
- A "Preview" action that drafts a sample pitch against a chosen campaign so you can see the voice change before saving it as the default.

**3. Drafting uses it**

`pitch-draft` loads the global profile plus any profile for the campaign's client and injects both into the model's system instructions, ordered so:
1. Hard client guardrails (existing) stay absolute and always win.
2. Global Uproar voice sets the default register.
3. Client voice override adjusts tone/vocabulary for that client.
4. The existing structural rules (subject length, 150-word body, no markdown) remain enforced.

If no profile exists, drafting behaves exactly as today.

## Keeping it in sync with your Claude skill

The voice guide lives in the dashboard as the source of truth for drafting. When you update the skill in Claude, paste the updated text into the admin page (or vice versa). There is no automatic sync — Claude skills aren't exposed over an API the app can read.

## Technical notes

- New table `pitch_voice_profiles` (`id`, `client_name` nullable = global, `name`, `guidance` text, `active` bool, `updated_by`, timestamps) with RLS: all authenticated users can read; only `has_role(auth.uid(), 'admin')` can write. GRANTs included in the migration.
- `supabase/functions/pitch-draft/index.ts`: fetch global + client profile alongside the existing guardrail/comms/coverage queries, and append them to the `system` instructions string. Truncate each to a safe character budget.
- New `src/pages/admin/VoiceProfilesPage.tsx` + route, linked from the admin area next to user management; React Query hooks in a new `useVoiceProfiles.ts`.
- No changes to the draft schema, `PitchDraftSheet`, or the campaign table.
