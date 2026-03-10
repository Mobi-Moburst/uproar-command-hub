

## Approach: Store Historical Data in the Database

The idea is to snapshot all placement records through 2025 into a database table, then only fetch 2026+ from Airtable live. This dramatically reduces load times (from 80+ pages of pagination to just a few) and gives you a stable historical baseline.

### How it works

```text
Dashboard request
  ├── DB query: placements where date <= 2025-12-31  (instant, cached)
  ├── Airtable fetch: placements where date >= 2026-01-01  (small, fast)
  └── Merge both → full dataset
```

### Steps

**1. Create a `placements_archive` table**
A database table mirroring the `MediaPlacement` type — stores all historical records through end of 2025.

**2. Create a backend function to seed the archive**
A one-time edge function (`seed-placements-archive`) that fetches all records from Airtable, filters to ≤2025, and inserts them into the archive table. You'd trigger it once manually.

**3. Update `placementsService.ts` to merge sources**
- Fetch archived records from the database (fast, no pagination)
- Fetch only 2026+ records from Airtable using `filterByFormula` (small set)
- Merge and deduplicate by record ID

**4. Same pattern for awards (if needed)**
Awards has far fewer records so it may not need this, but can follow the same approach later.

### Key details

- The archive table uses the Airtable record ID as its primary key, so re-running the seed is safe (upsert)
- The `filterByFormula` on the Airtable fetch would be: `IS_AFTER({Date}, '2025-12-31')` — cutting the live fetch to only current-year data
- No changes to mappers or types needed — the archive stores already-mapped data
- The seed function runs once; after that, all pre-2026 data loads instantly from the database

