
# Pulse Center: Reporter Matching + Pitch Drafting

Build steps 2 and 3 on top of the existing daily signal scan. Reporter matching runs automatically as part of every scan. Pitch drafting runs on-demand per reporter to keep AI cost low.

## Step 1 — Schema additions

Add two columns to `pulse_signals`:

- `matched_reporters jsonb` (default `'[]'`) — array of reporter objects produced during the scan.
- `drafted_pitches jsonb` (default `'{}'`) — keyed by reporter identifier; populated on demand.

Reporter object shape (stored in `matched_reporters`):

```text
{
  id: string,                  // stable hash of name+outlet
  name: string,
  outlet: string,
  source: "internal" | "web",  // where we found them
  score: number,               // 0-100 fit for THIS signal
  rationale: string,           // 1 sentence why they fit
  beats: string[],             // top types/topics they cover
  recent_examples: [           // up to 3
    { headline: string, url?: string, date?: string }
  ],
  contact_hint?: string,       // outlet domain / handle if discovered
  internal_stats?: {           // only if source=internal
    placements: number,
    conversion_rate: number,
    last_coverage_date: string
  }
}
```

Pitch object shape (stored in `drafted_pitches[reporterId]`):

```text
{
  subject: string,
  body: string,              // single short paragraph
  drafted_at: string,
  model: string
}
```

## Step 2 — Auto reporter matching (runs inside scan)

Extend `pulse-scan` edge function. For each signal it generates, immediately compute a ranked reporter list (5–8 reporters) using a hybrid source:

**A. Internal candidates** — query `placements_archive` + live placements for reporters whose `vertical` or `topic_product` overlaps the signal's `industry`/client keywords. Reuse the scoring logic from `SmartReporterMatcher.tsx` (placements volume, conversion rate from samples/briefings, reach, recency). Pull the top ~10.

**B. Web discovery** — use Firecrawl `search` with the signal's headline + industry to find recent articles (last 30 days) covering the same beat. Extract author + outlet from result metadata. De-dup against internal list by `name+outlet`.

**C. AI ranking pass** — send the combined candidate pool + the signal to Gemini Flash. Model returns the final ranked list with `score`, `rationale`, and `beats` per reporter. This gives one ranking pass per signal instead of per reporter.

Persist the result into `pulse_signals.matched_reporters` in the same insert.

Performance: scan today is sequential per client. Add `Promise.all` parallelism across signals within a client so matching doesn't blow up scan time. Cap web-discovery calls to 1 per signal.

## Step 3 — On-demand pitch drafting

New edge function `pulse-draft-pitch`:

- Input: `{ signal_id, reporter_id }`
- Auth: standard authenticated invoke.
- Loads the signal + matched reporter, sends a focused prompt to Gemini Flash, gets back `{ subject, body }`.
- Writes the result into `pulse_signals.drafted_pitches[reporter_id]` (JSONB merge).
- Returns the draft to the client.

Prompt anchors: client voice (pull from `client_enrichment` industries/keywords as context), the signal hook, the reporter's beats + 1 recent example, target = short cold pitch, single paragraph, ≤ 120 words, no "Hope you're well".

Caching: if `drafted_pitches[reporter_id]` already exists, return it without calling the AI unless `force=true`.

## Step 4 — UI on Pulse page

On each signal card (Signals tab), add a collapsible **"Reporters to pitch"** section:

- Renders `matched_reporters` as a compact list: rank badge, name • outlet, score chip, source tag (Internal vs Web), 1-line rationale, beats chips.
- Each reporter row has two actions:
  - **Draft pitch** — calls `pulse-draft-pitch`, shows a loading state, then expands into a subject + body view with **Copy** and **Regenerate** buttons.
  - **Open article** — links to `recent_examples[0].url` when present.
- If `matched_reporters` is empty (older signal), show "Match reporters" button that calls a small `pulse-match-reporters` function on-demand (same logic as Step 2 for one signal). This handles signals generated before this feature shipped.

No changes needed to claim/dismiss flow; pitches live alongside.

## Step 5 — Hook + types updates

- Extend `PulseSignal` interface in `src/hooks/usePulse.ts` with `matched_reporters` and `drafted_pitches`.
- Add `useDraftPitch(signalId, reporterId)` mutation that invokes `pulse-draft-pitch` and updates the React Query cache for `pulse-signals`.
- Add `useMatchReporters(signalId)` for the backfill button.

## Technical details

- **Edge functions**: `pulse-scan` (updated), `pulse-draft-pitch` (new), `pulse-match-reporters` (new, factored from scan).
- **AI model**: `google/gemini-2.5-flash-lite` for both matching rerank and pitch drafting (cost-efficient, JSON-capable). Use `response_format: { type: "json_object" }` for the matching pass.
- **Firecrawl**: `tbs: "qdr:m"` (last 30 days), `limit: 5` per signal for discovery.
- **Reporter ID**: deterministic `sha1(lowercase(name) + "|" + lowercase(outlet))` first 12 chars, generated in the edge function and reused by the UI.
- **Cost guardrails**: matching runs once per signal at scan time; pitch drafting only fires on user click and is cached forever (signals are ephemeral to today anyway).
- **Migration**: single migration adds the two jsonb columns with defaults; no GRANTs needed (existing policies already cover read/update).
- **No new tables** per your preference — keeps everything ephemeral with the daily signal.

## Out of scope (call out for later)

- Sending the pitch from inside the app (Gmail/Outlook send).
- Per-reporter "sent / skipped / replied" status tracking — would need the normalized-tables approach you ruled out for now.
- Cross-day reporter performance analytics on pitched-vs-claimed conversion.
