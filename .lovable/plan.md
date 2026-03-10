

## Client Detail Panel Improvements

Five changes to `src/pages/ClientsPage.tsx`:

### 1. Remove Vertical from Header
Line 121 — remove `· {selectedClient.vertical}` from the subtitle beneath the client name. Vertical is placement-specific, not client-level.

### 2. Recent Placements — Sort by Date Descending
Change the `clientPlacements` computation to sort by `p.date` descending before slicing to 5, so the most recent placements appear first.

### 3. Recent Placements — "All-Time" Info Tooltip
Add a small info icon with a tooltip (using the existing Tooltip components) next to the "Recent Placements" heading, explaining: *"Showing the 5 most recent placements across all time."*

### 4. Ad Value — Hover Tooltip for Data Gaps
Wrap the Ad Value KPI card value in a tooltip that says: *"Many placements in Airtable leave Ad Value blank, so this total may underrepresent actual value."*

### 5. Awards Submissions — Group by Year with Status Accordions
Replace the flat awards list with:
- Group awards by year (from `due_date`), current year first
- Within each year, group into collapsible accordions by status: **Won**, **Deferred**, **Not Selected**, then remaining statuses
- Use the existing Accordion/Collapsible components from the UI library
- Current year section open by default, prior years collapsed

### Files Changed
- `src/pages/ClientsPage.tsx` — all five changes above

