

## Plan: Fix Date Display Off-by-One

### Problem
`new Date("2026-04-06")` is parsed as midnight UTC, which shifts to the previous day in US timezones. Every date in the app shows one day early.

### Fix
In `src/lib/format.ts`, add `timeZone: "UTC"` to the `toLocaleDateString` options in both `formatDate` and `formatDateShort`. This forces the formatter to display the UTC date as-is, matching Airtable.

### Changes

**`src/lib/format.ts`** — 2 functions updated:

```typescript
// formatDate
return date.toLocaleDateString("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC"
});

// formatDateShort
return date.toLocaleDateString("en-US", {
  month: "short", day: "numeric", timeZone: "UTC"
});
```

One file, two lines changed. All date displays across the entire app (placements, overview, reports, awards, samples, briefings) will be corrected.

