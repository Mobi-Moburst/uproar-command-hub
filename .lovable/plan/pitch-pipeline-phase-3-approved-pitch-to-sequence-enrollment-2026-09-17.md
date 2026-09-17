# Pitch Pipeline Phase 3: approved pitch to sequence enrollment

The bridge from "a human approved this draft" to "HubSpot enrolled the reporter in a sequence and sent it as the PR person", without two people stepping on each other.

## The concurrency problem, stated plainly

The pitch text rides on a contact property (`ur_pitch_body`) that the sequence reads through a token. One property, one reporter, many pitchers. If Sam arms a pitch to a reporter and Alex arms a different one ninety seconds later, Alex's text overwrites Sam's before Sam's sequence has finished sending. The reporter gets Alex's pitch under Sam's name.

The fix is a claim: one active pitch per reporter at a time, enforced before anything is written to HubSpot.

## How the claim works

```text
Approve draft
   -> Claim the reporter   (fails if someone else holds it)
   -> Write ur_pitch_subject + ur_pitch_body to the contact
   -> Read the properties back and confirm they match
   -> Set Contact Owner = the arming PR user
   -> Create the ticket, move it to Pitched
   -> Flip ur_pitch_enroll_trigger = true
   -> Stamp last_pitched_date, New advances to Warm
   -> HubSpot workflow enrolls into the PR sequence, sends as Contact Owner
```

The claim is held until the reporter replies, the sequence finishes, or the ticket reaches In Conversation / Closed. A HubSpot workflow signals the release back; a scheduled reconcile also catches anything the workflow missed.

While a reporter is claimed:

- Any other campaign showing that reporter gets a hard "Claimed by {name} since {date}" badge, and the Approve and arm button is disabled with the reason on it.
- Admins can force-release a stuck claim from the reporter row. Every force-release is logged with who and when.
- The existing soft "recently pitched" badge stays as-is. A claim is the hard version of it.

## Hygiene rules that come with this

- Nothing arms without a human approving the exact text first.
- The body is written and verified before the trigger flips. If the read-back does not match, the arm aborts and the claim releases, so a half-written pitch never enrolls.
- Arming is serialized per reporter in the database, so two simultaneous clicks cannot both win.
- Bulk arm is a queue, not a burst: reporters already claimed are skipped and reported, and the run stops at the per-user daily sequence cap.
- Released claims keep their history, so a reporter's page shows who pitched what and when.

## What you create in HubSpot

Contact properties (single-line text unless noted):

| Property | Type | Purpose |
|---|---|---|
| `ur_pitch_subject` | text | Subject line token |
| `ur_pitch_body` | multi-line text | Pitch body token |
| `ur_pitch_enroll_trigger` | checkbox | Workflow A trigger, cleared after enrollment |
| `ur_pitch_claimed_by` | text | Email of the PR person holding the reporter |
| `ur_pitch_claimed_at` | date | When the claim started |
| `ur_pitch_campaign` | text | Client and angle, for readability in the CRM |
| `ur_pitch_release_signal` | checkbox | Workflow sets this on reply or sequence end |

One sequence to build: a shared PR sequence, send as Contact Owner, body from `{{ contact.ur_pitch_body }}`, subject from `{{ contact.ur_pitch_subject }}`, auto-unenroll on reply.

Two workflows:

- **Enroll**: trigger `ur_pitch_enroll_trigger = true` -> enroll in the PR sequence -> clear the trigger.
- **Release**: trigger on reply received, sequence finished, or unenrolled -> set `ur_pitch_release_signal = true`.

The existing sales firewall workflow stays untouched.

## One thing to verify before this is trusted at volume

HubSpot may render `{{ contact.ur_pitch_body }}` once at enrollment or fresh at each send in the sequence. The claim covers us either way, but if it re-reads live, the body must stay untouched for the whole sequence, which makes claim length a correctness requirement rather than a courtesy. First step of the build is a two-contact test that settles this, and the answer gets written into the plan file.

## What you will see in the app

- **Draft sheet**: Approve becomes "Approve and arm", with a confirm step naming the reporter, the sender, and the sequence. A claimed reporter shows the holder instead of the button.
- **Media list rows**: claim badge, ticket stage once created, and a link into the HubSpot contact.
- **Campaign header**: "Arm all approved" with a pre-flight summary of how many will arm, how many are claimed elsewhere, and how many hit the daily cap.
- **Admin**: a claims view listing every active claim with age, holder, and a force-release action.

## Technical detail

**New table `pitch_claims`**: `hubspot_contact_id` (unique partial index where released_at is null), `campaign_id`, `contact_id`, `claimed_by`, `claimed_at`, `released_at`, `release_reason`, `forced_by`. RLS: authenticated read, writes through the edge function with service role. GRANTs on creation.

**`pitch_contacts`** gains `armed_at`, `arm_error`. **`pitch_drafts.status`** gains `armed`.

**New actions in `pitch-hubspot`**, all resolving stage IDs through the existing `load-pipeline` map, no hardcoded IDs:

- `create-ticket` — one ticket per reporter per campaign, named `{client} / {angle} — {reporter}`, associated to the contact, stage Researching.
- `approve-and-arm` — the full sequence above, in order, with claim acquisition first and abort-and-release on any failure.
- `set-stage` — label-based write then refetch into `stage_cache`.
- `read-stages` — batch read for the board.
- `release-claim` — manual or admin force release.
- `reconcile-claims` — reads `ur_pitch_release_signal` and ticket stages, releases anything finished, clears the signal.

**Scheduled**: `reconcile-claims` runs on a cron every 30 minutes so claims free themselves without anyone clicking.

**Error surface**: any HubSpot failure during arm returns the provider status and body, stores it on `pitch_contacts.arm_error`, and shows on the row.

## Build order

1. Create the HubSpot properties, sequence, and two workflows; run the token-timing test.
2. `pitch_claims` table and claim acquire/release logic with the badges and disabled buttons.
3. `create-ticket` and `approve-and-arm`, single contact only.
4. Bulk arm with the queue and cap handling.
5. `read-stages`, `set-stage`, and the reconcile cron.

Step 1 is on you in HubSpot. The rest lands behind it, and steps 2 through 5 can be built and tested against a single test contact before anyone pitches for real.
