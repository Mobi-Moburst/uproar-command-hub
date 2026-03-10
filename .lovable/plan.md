

## Problems Identified

### 1. Placements mapper mismatches
From the actual Airtable response, here's what the fields look like vs what the mapper expects:

| App field | Mapper expects | Actual Airtable field | Issue |
|-----------|---------------|----------------------|-------|
| `client_name` | `f["Client"]` | `["Orlando Museum of Art"]` (array of strings) | Returns array, not string — needs `[0]` |
| `team_name` | `f["Team"]` | `["Bri, Natalie"]` (array) | Same — array |
| `type` | `f["Type"]` | `["Roundup"]` or `[]` (array) | Array, not string; also has values like "Roundup", "Feature", "Syndication" not in the type union |
| `readership_viewership` | `f["Readership / Viewership"]` | `f["Readership/Viewership"]` | Wrong key — no spaces around `/` |
| `ad_value` | `f["Ad Value"]` | Not present in data | Field may not exist or have a different name |
| `secured_by` | `f["Secured By"]` | `f["Secured by?"]` | Wrong key |
| `topic_product` | `f["Topic / Product"]` | `f["Topic/Product"]` | Wrong key — no spaces |
| `weekly_wins_trigger` | `f["Weekly Wins Trigger"]` | Not visible in data | May not exist |

### 2. Awards mapper mismatches
From the actual awards response:

| App field | Mapper expects | Actual Airtable field | Issue |
|-----------|---------------|----------------------|-------|
| `client_name` | `f["Client"]` | `["recfkNRAYEGS0gMpo"]` (array of record IDs) | Linked record IDs, not names |
| `award_name` | `f["Award"]` | `["rec7xbleqXjxbMwdH"]` (array of record IDs) | Linked record IDs, not names |
| `award_edition` | `f["Award Edition"]` | `["recruajCtqQxxCpvp"]` (array of record IDs) | Linked record IDs |
| `team_name` | `f["Team"]` | `f["Team (from Client)"]` → `["Erica, Micalyn, Hallie"]` | Different field name, array |
| `submission_title` | `f["Submission"]` | Present as `"Submission"` | Correct |
| `due_date` | `f["Due Date"]` | `["2024-06-28"]` (array) | Array, not string |
| `status` | `f["Status"]` | Values include "Planned", "Not selected", "Shortlisted", "Deferred" | Not in type union |
| `notes` | `f["Notes"]` | `f["Internal Notes"]` | Different field name |

### 3. Clients service is still returning mock data
`clientsService.ts` returns hardcoded mock data. Needs to derive from placements + awards.

### 4. Performance: too many records
The placements table has thousands of records, causing 80+ pagination requests. Need to limit or cache.

---

## Plan

### Step 1: Fix placement mapper field names
Update `mappers.ts` `mapPlacement` to handle:
- Array fields (`Client`, `Team`, `Type`): extract `[0]` 
- Correct field names: `"Readership/Viewership"`, `"Secured by?"`, `"Topic/Product"`
- Expand the `MediaPlacement.type` union in `types.ts` to include "Roundup", "Feature", "Syndication" etc.

### Step 2: Fix awards mapper field names
Update `mapAward` to handle:
- `"Team (from Client)"` instead of `"Team"` (extract `[0]`)
- `"Due Date"` as array: extract `[0]`
- Client/Award/Award Edition are linked record IDs — use the `"Submission"` field to extract client name (format is "ClientName × AwardName — Edition"), or use the `"Unique Key"` field
- Add new statuses to `AwardSubmission.status` union: "Planned", "Not selected", "Shortlisted", "Deferred"
- Use `"Internal Notes"` for notes

### Step 3: Derive clients from live data
Update `clientsService.ts` to aggregate from placements + awards instead of returning mock data. Extract unique client names from placements, compute totals.

### Step 4: Add performance guard
Pass `pageSize=100` and optionally a `filterByFormula` or `maxRecords` param to the edge function to limit initial load, or add a `maxRecords` option.

### Step 5: Update types
Expand type unions in `types.ts` to match actual Airtable values.

