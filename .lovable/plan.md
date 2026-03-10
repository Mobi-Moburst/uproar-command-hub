

# Secure Airtable Integration via Edge Function

## Secrets to Store

Three secrets need to be added to Lovable Cloud:

| Secret Name | Value |
|---|---|
| `AIRTABLE_API_KEY` | `pat8zi6egbBhSNE3e.15e264e173597b06999524505be3c7c2d6802baa7597303da764be3192856536` |
| `AIRTABLE_BASE_PLACEMENTS` | `appi54aIM1EOb7guO` |
| `AIRTABLE_BASE_AWARDS` | `appmOjxhcpmc19zCd` |

## Architecture

```text
Browser  →  Edge Function (airtable-proxy)  →  Airtable API
              ↑ secrets stay here
```

### Edge Function: `supabase/functions/airtable-proxy/index.ts`
- Accepts `{ base: "placements" | "awards", table: string }` in POST body
- Reads secrets server-side, proxies request to Airtable, handles pagination
- Returns JSON array of records
- CORS headers included, JWT verification disabled (public data)

### Client-side changes
- Update `src/services/airtable.ts` to call the edge function instead of Airtable directly
- Remove all `VITE_AIRTABLE_*` env var references
- `isAirtableConfigured()` will always return true (edge function handles credentials)

### Table names
- Placements table ID: `tblsFhq3a6NPalO5N`
- Awards table ID: `tblyqY5sA6j41GqYY`

Update `TABLE_NAMES` in `airtable.ts` to use these table IDs directly for reliability.

### Config update
- Add `[functions.airtable-proxy]` with `verify_jwt = false` to `supabase/config.toml`

## Files

| Action | Path |
|---|---|
| Create | `supabase/functions/airtable-proxy/index.ts` |
| Edit | `src/services/airtable.ts` |
| Edit | `supabase/config.toml` (add function config) |

No changes to mappers, hooks, pages, or UI components.

