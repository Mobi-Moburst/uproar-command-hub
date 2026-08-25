# Add Claude (Anthropic) for narrative writing tasks

Lovable AI's built-in gateway serves OpenAI and Google models only — Anthropic isn't in it. So this uses your own Anthropic API key, stored as a project secret, called directly from the edge functions. Those calls bill to your Anthropic account and won't appear in Lovable's AI usage logs.

## Which functions switch to Claude

Claude becomes the primary model for the four writing/narrative jobs:

- `pitch-draft` — pitch subject + body
- `client-coverage-brief` — coverage themes and angle suggestions
- `ai-coverage-summary` — narrative coverage synthesis
- `pulse-draft-pitch` — Pulse pitch angle drafts

Left on Lovable AI (extraction/classification, not writing): `pulse-scan`, `pulse-match-reporters`, `hubspot-client-comms`, `extract-sow`.

## Fallback behavior

Every Claude call is wrapped: if Anthropic returns an error (rate limit, credit, outage, or the key isn't set at all), the exact same prompt is re-sent to the existing Lovable AI model and the feature completes normally. The response tells the UI which provider actually answered, so failures are visible without breaking anything.

Rules:
- No key configured → silently use Lovable AI (nothing breaks before the key is added).
- Anthropic 429/5xx → fall back immediately, log the reason.
- Anthropic 400 (bad request) → fall back and log loudly; that's a bug to fix, not a transient issue.
- One attempt at Anthropic per request, no retry loops.

## Technical notes

- New shared module `supabase/functions/_shared/ai-writer.ts`:
  - `callWriter({ system, user, jsonSchema, fallback })` — tries Anthropic Messages API (`https://api.anthropic.com/v1/messages`, `anthropic-version: 2023-06-01`, streaming so long generations don't hit the ~2 min function timeout), then falls back to the caller-supplied Lovable AI call.
  - Model: `claude-sonnet-4-5` (configurable via an `ANTHROPIC_MODEL` secret if you want to pin something else).
  - JSON output is enforced via a single Anthropic tool with the existing JSON schema (Anthropic's equivalent of structured output), so `pitch-draft`'s strict `{subject, body}` shape and the brief schemas keep working unchanged.
  - No timeout wrappers or abort timers on either provider.
- Each of the four functions is refactored to build its prompt once and hand it to `callWriter`, keeping its current Lovable AI request as the fallback closure. Response shape returned to the frontend is unchanged, plus an optional `provider` field.
- Frontend: no functional change. A small "drafted by Claude / Lovable AI" indicator can be added to the pitch draft sheet if you want the provenance visible — say the word.
- Secret: `ANTHROPIC_API_KEY` requested via the secure secret form (get it from console.anthropic.com → API Keys). It stays server-side only.
- Verification: after deploy, invoke each of the four functions once and confirm a real Claude response, then temporarily use a bad key to confirm the fallback path returns a valid result.
