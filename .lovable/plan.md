

## Recent Impactful Placements

Rename the section to **"Top Placements This Month"** and replace the pure date sort with an impact-weighted sort within the current month's data.

### Impact scoring

Score each placement using a weighted formula combining **type tier** and **reach**:

```text
score = (type_weight * 0.4) + (normalized_reach * 0.6)
```

**Type tiers** (based on your Airtable types from the screenshot):

| Tier | Weight | Types |
|------|--------|-------|
| High | 1.0 | Feature, Interview, Broadcast, Product review |
| Medium | 0.6 | Contributed content, Announcement, Data, Award |
| Low | 0.3 | Mention, Syndication, Social media, Roundup |

**Reach normalization**: each placement's reach divided by the max reach in the set, so it scales 0-1.

### Changes

**`src/pages/OverviewPage.tsx`**
- Filter to `thisMonthPlacements` first (already computed)
- Apply impact scoring and sort descending
- Take top 8
- Rename section heading to "Top Placements This Month"
- Add a subtle reach indicator or keep the existing reach column

This keeps it recent (month-scoped) while surfacing the most meaningful wins — a Feature in Forbes with 2M reach appears above a Syndication mention with 500 reach.

