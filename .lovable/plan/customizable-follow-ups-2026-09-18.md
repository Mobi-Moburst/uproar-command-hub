# Customizable follow-ups

Right now every pitch gets the same two follow-ups: day 3 ("Following up on the note below in case it got buried.") and day 7 ("Last nudge from me on this one."). The storage for custom cadences already exists, nothing in the app writes to it. This adds the editing experience.

## What people will be able to do

**Per campaign, before sending**
A "Follow-ups" panel on the campaign page, sitting above the media list:

- A master on/off switch. Off means a pitch goes out with no follow-ups queued.
- A list of steps, each a card with: "Send N days after the pitch" and a message box with the same formatting toolbar as the pitch editor (bold, links, lists).
- "Add a step" (up to four), and a remove button per step.
- A plain summary line under the switch: "2 follow-ups, day 3 then day 7."
- Saving applies to pitches sent from that point on. Anything already queued is untouched, and the panel says so.

**Per reporter, before approving**
The draft sheet already says "day 3 and day 7" as static text. That becomes a real summary of the campaign cadence, with a small "Edit follow-ups" link that opens the same panel. No per-reporter overrides in this pass, that adds more confusion than value.

**After sending, in the queue**
A "Scheduled follow-ups" section on the inbox thread view for a sent pitch:

- Each pending step shows the date it will send and its text.
- Edit the text or the date on a single queued follow-up.
- "Skip this one" cancels that step only, "Stop follow-ups" cancels the rest for that reporter.
- Replies still cancel everything automatically, as they do today.

**Defaults**
A new campaign starts from the day-3/day-7 pair so nobody has to configure anything to send. A "Reset to default" link in the panel restores it.

## Guardrails kept

- Nothing sends without a human approving the first pitch, and follow-up text is written or accepted by a person up front.
- Day values must be 1 or more and strictly increasing, so two steps can't land the same day.
- Each person's signature is still appended, so steps should not include one.
- The daily send cap and the reporter cooldown are unchanged.

## Technical notes

- `pitch_send_settings` already holds `campaign_id`, `followups_enabled` and a `steps` jsonb array of `{ day, body }`, with authenticated insert/update policies. No migration needed for the campaign-level editor.
- New hook `useFollowupSettings(campaignId)` in `src/hooks/`: read the row, upsert on save, seed the default array when the row is missing.
- New component `src/components/pitch/FollowupSettings.tsx` using `RichTextEditor` for each step body, mounted in `PitchCampaignPage.tsx`. Validation on day ordering happens before the upsert.
- `scheduleFollowups` in `supabase/functions/pitch-send/index.ts` already reads the row and falls back to the default pair, so no edge function change is needed for the campaign-level part.
- Queue editing needs writes to `pitch_followups` rows with `status = 'scheduled'`: current RLS is select-only for authenticated users, so this part needs a migration adding update policies scoped to the owning send's `sender_user_id`, plus grants. `pitch-followup-run` already reads `body` and `scheduled_for` at send time, so edits take effect without further changes.
- `usePitchInbox.ts` gains a scheduled-followups query and mutations for edit, skip and stop.

## Build order

1. Campaign-level panel, hook, validation, and real cadence summary in the draft sheet.
2. Migration for scheduled follow-up updates, then the queue section in the inbox thread with edit, skip and stop.
