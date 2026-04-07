

## Plan: Make Notes Searchable in Placements View

### What's Already Working
- Notes are already ingested from Airtable (the `mapPlacement` function handles `f["Notes"]`)
- Notes are already stored in the `placements_archive` table
- Notes are already on the `MediaPlacement` type

### Changes Needed

**`src/pages/PlacementsPage.tsx`** — two small edits:

1. **Add `p.notes` to the search fields array** (line 43) so searching covers notes content:
   ```typescript
   const match = [p.headline, p.outlet, p.client_name, p.reporter_name, p.secured_by, p.vertical, p.type, p.notes]
   ```

2. **Add a "Notes" column to the table** — display truncated notes text (first ~80 chars) with a tooltip or expandable row for the full content. This gives the team visibility into notes without cluttering the table.

### Files modified
- `src/pages/PlacementsPage.tsx` — add notes to search + add notes column to table

One file, two small changes.

