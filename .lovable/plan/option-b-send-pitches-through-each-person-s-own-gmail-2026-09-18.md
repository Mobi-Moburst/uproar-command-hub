# Option B: send pitches through each person's own Gmail

A second route to the same outcome, for the case where 20 HubSpot Sales seats is not worth it. Everything up to approval stays exactly as it is today: import, CRM write-back at import, conflict badges, AI draft, human approval. Only the send changes.

## What changes vs Option A (HubSpot sequences)

| | Option A: HubSpot sequences | Option B: Gmail |
|---|---|---|
| Send path | HubSpot workflow enrolls, sends as Contact Owner | Dashboard sends through the PR person's own Gmail |
| Cost | ~20 Sales seat upgrades | No seat cost |
| Opens / clicks | Yes, in HubSpot | No open or click tracking |
| Reply detection | HubSpot sequence status | We poll each user's Gmail threads for replies |
| Logging to CRM | Native | We write the sent pitch and the reply back onto the contact |
| Board and stages | Unchanged | Unchanged |
| Firewall against sales | Unchanged | Unchanged |

We lose open and click tracking. We keep reply tracking, send history, the ticket board, and everything the dashboard already computes.

## How it works

Each PR person connects their own Google account once, from their account page. After that:

```text
Approve draft
   -> Claim the reporter (same lock as today, stops two people pitching at once)
   -> Send from the approver's Gmail, threaded
   -> Log the sent pitch on the HubSpot contact, create/move the ticket to Pitched
   -> Schedule follow-up 1 and follow-up 2
   -> Poll the thread; a reply cancels remaining follow-ups and releases the claim
```

Follow-ups are a cadence you set per campaign, for example day 3 and day 7. Any reply, in the thread or from that reporter's address, stops the rest. Nothing sends without a human approving the first pitch, and follow-ups only reuse text approved up front.

## What the team sees

- **Account page**: "Connect Gmail" with the connected address and a disconnect button. Unconnected users can draft and approve but not send.
- **Draft sheet**: "Approve and send" instead of "Approve and arm", showing which address it will go from and the follow-up schedule.
- **Contacts table**: sent / awaiting reply / replied / bounced, days since send, next follow-up date, and the existing claim and stage columns.
- **Campaign header**: "Send approved", with a pre-flight count of how many will send, how many are claimed elsewhere, and how many hit the daily cap.
- **Admin**: who is connected, per-user daily send counts, a queue view of scheduled follow-ups with a cancel action.

## Guardrails

- Per-user daily send cap, defaulting to the same 200, plus a per-reporter cooldown so nobody gets two campaigns in a week.
- Test mode stays: mock addresses only until you say otherwise.
- Bounce and hard-failure handling marks the contact and surfaces it on the row rather than retrying.
- Gmail's own sending limits apply (roughly 2,000/day on Workspace), well above what a PR list needs.

## Technical detail

**Connector**: the Gmail App User Connector (`google_mail`), per-user OAuth, scopes `gmail.send`, `gmail.readonly`, `gmail.modify`. Each user's connection key is stored server-side, encrypted, keyed to their user ID, in a new `app_user_connections` table. No Google credential ever reaches the browser.

**New tables**
- `app_user_connections` — encrypted per-user connector key, service-role only.
- `pitch_sends` — contact_id, draft_id, sender user, gmail_message_id, gmail_thread_id, sent_at, status (sent / replied / bounced / cancelled), reply_at, reply_snippet.
- `pitch_followups` — send_id, step, scheduled_for, status, sent_at, cancelled_reason.
- `pitch_send_settings` — per-campaign follow-up cadence and copy.

**New edge functions**
- `pitch-send` — claim, build the RFC 2822 message, send through the connector gateway, record `pitch_sends`, log to HubSpot, ensure the ticket and move it to Pitched, schedule follow-ups.
- `pitch-followup-run` — cron every 15 minutes: send due follow-ups, skip anything replied or cancelled.
- `pitch-reply-poll` — cron every 15 minutes: read each sender's threads by thread ID, mark replies, cancel follow-ups, release the claim, move the ticket, write the reply back to HubSpot.

**Reused as-is**: `pitch_claims` and the claim logic, `pitch-hubspot` ticket actions and stage sync, drafting, guardrails, badges. The `ur_pitch_*` token properties become unused in this option, though the sent body still gets logged to the contact.

## Build order

1. Gmail App User Connector client and per-user connect flow on the account page.
2. `pitch_sends` plus single send, no follow-ups, against a mock address.
3. Reply polling and status badges.
4. Follow-up scheduling, cadence settings, cancel on reply.
5. Caps, bounce handling, admin queue view.

Roughly comparable effort to Phase 3 as specced, with the reply poller as the one genuinely new piece. Steps 1 through 3 are enough to pilot.

## Open question for the comparison

If any part of Uproar later buys the Sales seats, both paths can coexist: a per-campaign choice of "send via Gmail" or "arm for HubSpot sequence", since everything up to approval is shared. Worth saying that out loud when you present the two options.
