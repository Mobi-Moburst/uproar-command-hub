

# Dashboard Review: Data Gaps and Recommendations for Uproar

After reviewing every page, data service, and mapper in the Command Center, here's what's working well and where the team can get more value through better data hygiene in Airtable.

---

## What's Working Well

The dashboard is pulling from two sources (Airtable live + DB archive) and successfully surfaces placements, awards, clients, teams, reporters, and verticals. The filtering, sorting, type trend chart, team MoM comparisons, and reporter scoring are all functional and well-connected.

---

## Data Quality Issues to Flag for the Uproar Team

### 1. `topic_product` is Blank for All Archived Placements

**Impact: High.** The archive fetch in `placementsService.ts` hardcodes `topic_product: ""` even though the column exists in the database and the seed function writes it. This means ~all pre-2026 placements show "–" for Topic/Product, making the filter and trend analysis unreliable.

**Fix (internal):** Update the archive query to include the `topic_product` column. No Airtable changes needed — this is a code fix on our side.

### 2. `notes` is Also Dropped from Archive

Same issue — archived placements set `notes: ""` even though the data exists in the DB. Notes context is invisible for historical records.

### 3. Hardcoded Dates on Overview and Weekly Wins

- Overview says "Executive summary — March 2026" regardless of when it's viewed
- Weekly Wins says "Week of March 10, 2026" statically
- "This month" filter uses hardcoded `"2026-03-01"` instead of dynamic date math

**Recommendation:** Make these dynamic so the dashboard stays accurate without code changes each month.

### 4. Missing or Inconsistent Airtable Fields (Team Action Items)

These are things the Uproar team should audit in their Airtable base:

| Field | Issue | Impact |
|-------|-------|--------|
| **Reporter Name** | Often blank | Reporters page undercounts relationships; many placements show "–" |
| **Ad Value** | Frequently $0 or blank | Ad value KPIs underreport; tooltip on Clients page already warns about this |
| **Readership/Viewership** | Sometimes 0 for real placements | Reach metrics and vertical benchmarks skew low |
| **Topic/Product** | Inconsistently filled | Topic filter has sparse options; can't track narrative alignment over time |
| **Secured By** | Blank on older records (backfilled as "Uproar") | Individual attribution impossible for historical wins |
| **Vertical** | Some placements lack a vertical tag | Vertical benchmarking page misses those records entirely |
| **Type** | Defaults to "Online" when blank | Type trend chart may overweight "Online" vs. actual mix |

**Recommendation for the team:** Run a quarterly data audit in Airtable. The fields with the highest ROI to clean up are **Reporter Name**, **Type**, and **Topic/Product** — these power three of the newest analytics features (Reporter Analytics, Type Trends, Topic filtering).

### 5. Weekly Wins Aren't Date-Scoped

The Weekly Wins page shows ALL placements ever flagged as weekly wins, not just the current week. There's no date-based grouping — if the team flags wins from different weeks, they all blend together.

### 6. Client Report Page Isn't in Navigation

`/report` exists and is a polished client-facing report, but it's not accessible from the sidebar. The team may not know it's there.

### 7. No Data Export

No page offers CSV/Excel export. For a team that likely needs to pull data into slide decks or share with clients, this is a gap.

---

## Recommended Improvements (Prioritized)

### Quick Wins (code changes, no Airtable work needed)

1. **Fix archive query** — include `topic_product` and `notes` columns from the DB instead of hardcoding empty strings
2. **Dynamic dates** — replace hardcoded "March 2026" strings with `format(new Date(), ...)` calls
3. **Add Client Report to sidebar** — or add a "Generate Report" button on the Clients page
4. **Scope Weekly Wins by week** — group by ISO week or let users pick a date range

### Medium Effort

5. **CSV export button** — add to Placements, Reporters, and Verticals pages (generate client-side from filtered data)
6. **Data completeness indicators** — show a small "fill rate" metric on the Overview page (e.g., "Reporter Name: 72% filled") so the team knows where to focus cleanup
7. **Awards pipeline date filtering** — the Awards page has no date range controls unlike Teams

### Airtable Hygiene (team process changes)

8. **Standardize Reporter Name entry** — consistent "First Last" format; avoid abbreviations
9. **Always tag Type explicitly** — don't rely on the "Online" default; distinguish Feature vs. Mention vs. Interview
10. **Fill Topic/Product on every placement** — this is the key to tracking narrative/messaging effectiveness over time
11. **Add Readership/Viewership even if estimated** — a rough number is better than 0 for benchmarking

---

## Summary

The dashboard is mature and well-structured. The biggest untapped value is in **data completeness on the Airtable side** — the analytics features are ready, but they're only as good as the data flowing in. A focused cleanup of Reporter Name, Type, and Topic/Product would immediately improve the Reporter Analytics, Type Trends, and filtering capabilities. On the code side, the archive query fix and dynamic dates are straightforward wins.

