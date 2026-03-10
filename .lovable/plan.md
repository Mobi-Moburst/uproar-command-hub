

## Fix Award Year Extraction

The current code only extracts years from `due_date`. When that's missing, awards fall into "Unknown Year" — even though the year is clearly present in `award_edition` (e.g., "TMSA: Trailblazer Award — 2025") or `submission_title`.

### Change (in `ClientsPage.tsx`, line 60)

Replace the year extraction logic with a fallback chain:

1. Try `due_date`
2. If missing, extract a 4-digit year from `award_edition`
3. If still missing, extract from `submission_title`
4. Default to 0 ("Unknown Year") only if none found

```typescript
function extractYear(a: AwardSubmission): number {
  if (a.due_date) return new Date(a.due_date).getFullYear();
  const match = (a.award_edition || '').match(/\b(20\d{2})\b/)
    || (a.submission_title || '').match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1], 10) : 0;
}
```

### File Changed
- `src/pages/ClientsPage.tsx`

