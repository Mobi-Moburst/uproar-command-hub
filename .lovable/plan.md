

## Problem

The Overview KPIs are mixing scopes — "Placements This Month" is correctly filtered to March 2026, but Total Reach, Total Ad Value, Awards In Progress, and Award Wins are computed over **all-time data** (22K+ records). This produces nonsensical numbers like "776090.1M" reach.

## Fix

Scope all KPIs to the **current month** (March 2026) so the executive summary is a monthly snapshot.

### Changes in `src/pages/OverviewPage.tsx`

1. **Total Reach & Total Ad Value** — filter to `thisMonthPlacements` instead of all `placements`:
   ```ts
   const totalReach = thisMonthPlacements.reduce((sum, p) => sum + p.readership_viewership, 0);
   const totalAdValue = thisMonthPlacements.reduce((sum, p) => sum + p.ad_value, 0);
   ```

2. **Awards In Progress & Award Wins** — filter awards to current month using their `deadline` or `submitted_date` field (whichever is relevant), or keep all-time if awards don't have monthly granularity. Need to check the award type fields.

3. **Active Clients** — could also be scoped to "clients with placements this month" for consistency, or kept as total active clients. Will keep as-is since it represents current roster.

4. **Weekly Wins** — already contextually current, no change needed.

5. **`formatNumber` in `src/lib/format.ts`** — add a billion-level format to handle edge cases:
   ```ts
   if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
   ```

### Summary of scope after fix

| KPI | Scope |
|-----|-------|
| Active Clients | All active (roster size) |
| Placements This Month | March 2026 |
| Total Reach | March 2026 placements |
| Total Ad Value | March 2026 placements |
| Awards In Progress | All-time (status-based, not date-based) |
| Award Wins | All-time (status-based) |

Awards are status-based ("Drafting", "Submitted", "Won") so monthly filtering doesn't apply cleanly — "In Progress" already means currently active, and "Won" is cumulative. These make sense as-is. The key fix is scoping Reach and Ad Value to this month.

