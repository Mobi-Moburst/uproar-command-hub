

## Plan: Add Client Health + Active/Inactive Controls

### Problem
Currently, client status ("Active") is hardcoded from placement data — there's no way for teams to manually set a client as active/inactive or indicate client health (red/yellow/green).

### Solution
Store health and status overrides in the existing `client_enrichment` database table (already has `client_name` as the key). Add two new columns: `health` (text: red/yellow/green) and `status_override` (text: active/inactive). Display these as interactive controls in the client detail panel.

### Changes

**1. Database migration** — add two columns to `client_enrichment`:
```sql
ALTER TABLE public.client_enrichment
  ADD COLUMN IF NOT EXISTS health text NOT NULL DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS status_override text;
```
- `health`: defaults to "green", values are "red", "yellow", "green"
- `status_override`: nullable, values are "Active" or "Inactive". When null, falls back to the current derived status.

**2. `src/pages/ClientsPage.tsx`** — add controls to client detail panel:
- **Health indicator**: Three colored dot buttons (red/yellow/green) below the client name. Clicking one saves to `client_enrichment`. Show the current health as a filled dot.
- **Active/Inactive toggle**: A switch component next to the status badge. Toggling saves to `client_enrichment.status_override`.
- Fetch `client_enrichment` data and upsert on change using the Supabase client.

**3. `src/services/clientsService.ts`** — merge enrichment data:
- After building the client map from placements/awards, fetch all `client_enrichment` rows.
- Override each client's `status` with `status_override` when set.
- Attach `health` field to each client.

**4. `src/data/types.ts`** — extend `Client` interface:
- Add `health?: "red" | "yellow" | "green"` field.

**5. Client table row** — show health dot:
- Add a small colored dot in the client table row (next to the name or status) so health is visible at a glance without opening the detail panel.

**6. Overview/filter updates**:
- The "active clients" count in the header will now reflect manual overrides.
- The status filter will include manually set statuses.

### UI Behavior
- Health dots: three small circles (red, yellow, green) — the active one is filled, others are outlined. Click to change.
- Active/Inactive: a Switch component. When toggled off → "Inactive", toggled on → "Active". Persists immediately via upsert.
- Both controls appear in the client detail panel header area, below the client name and status badge.

### Files modified
- Database migration (1 new migration)
- `src/data/types.ts`
- `src/services/clientsService.ts`
- `src/pages/ClientsPage.tsx`

